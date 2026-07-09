import { useState, useEffect } from "react";
import { Lock, ShieldCheck, Mail, KeyRound, ArrowRight, AlertTriangle, Fingerprint, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { useSignUp, useSignIn, useUser } from "@clerk/clerk-react";
import { useAuth } from "../lib/auth";

type Mode = "signin" | "signup";
type Step =
  | "credentials"
  | "otp"
  | "password"
  | "biometric-offer"
  | "biometric-register"
  | "biometric-verify"
  | "new-device-otp"
  | "new-device-biometric";

export default function LoginPage() {
  const { signOut } = useAuth();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { user: clerkUser, isSignedIn } = useUser();

  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passkeysSupported = typeof window !== "undefined" && "PublicKeyCredential" in window;

  useEffect(() => {
    if (isSignedIn) {
      setError(null);
    }
  }, [isSignedIn]);

  const handleDifferentAccount = () => {
    signOut();
    reset();
  };

  const reset = () => {
    setStep("credentials");
    setError(null);
    setInfo(null);
    setOtp("");
    setPassword("");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const clerkError = (e: any): string => {
    if (e?.errors?.[0]?.message) return e.errors[0].message;
    if (e?.message) return e.message;
    return "An unexpected error occurred.";
  };

  const isSessionExistsError = (msg: string): boolean =>
    msg.toLowerCase().includes("session") && msg.toLowerCase().includes("exists");

  // ---- SIGN UP ----
  const handleSignupSendOtp = async () => {
    setError(null);
    if (isSignedIn) return;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid operator ID (email).");
      return;
    }
    if (!signUpLoaded || !signUp) return;
    setBusy(true);
    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setInfo(`A 6-digit numeric code was sent to ${email}. Type the code below to verify your operator ID. Do not click any link in the email — only the numeric code grants access.`);
      setStep("otp");
    } catch (e: any) {
      const msg = clerkError(e);
      if (isSessionExistsError(msg)) return;
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSignupVerifyOtp = async () => {
    setError(null);
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    if (!signUp) return;
    setBusy(true);
    try {
      await signUp.attemptEmailAddressVerification({ code: otp });
      setInfo("Operator ID verified. Set a cipher (password) for your account.");
      setStep("password");
    } catch (e: any) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSignupSetPassword = async () => {
    setError(null);
    if (!password || password.length < 8) {
      setError("Cipher must be at least 8 characters.");
      return;
    }
    if (!signUp) return;
    setBusy(true);
    try {
      await signUp.update({ password });
      if (signUp.status !== "complete") {
        await setSignUpActive({ session: signUp.createdSessionId });
      }
      setInfo("Account created. You're signed in.");
      setStep("biometric-offer");
    } catch (e: any) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSignupSkipBiometric = () => {
    setError(null);
    setInfo(null);
  };

  const handleSignupRegisterBiometric = async () => {
    setError(null);
    if (!passkeysSupported) {
      setError("No biometric hardware found on this device. You can continue without it.");
      return;
    }
    setBusy(true);
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setError("No biometric hardware found on this device. You can continue without it.");
        return;
      }
      const u = clerkUser as any;
      await u?.reload();
      await u?.createPasskey();
      setInfo("Biometric credential registered. You can use it for faster sign-in next time.");
    } catch (e: any) {
      setError(clerkError(e) + " You can continue without biometric.");
    } finally {
      setBusy(false);
    }
  };

  // ---- SIGN IN ----
  const handleSignin = async () => {
    setError(null);
    if (isSignedIn) return;
    if (!email || !password) {
      setError("Enter operator ID and cipher.");
      return;
    }
    if (!signInLoaded || !signIn) return;
    setBusy(true);
    try {
      await signIn.create({ identifier: email });
      await signIn.attemptFirstFactor({ strategy: "password", password });
      if (signIn.status === "complete") {
        await setSignInActive({ session: signIn.createdSessionId });
      } else if (signIn.status === "needs_second_factor") {
        setInfo("Complete the biometric prompt to engage the console.");
        setStep("biometric-verify");
        await attemptPasskeyVerify();
      }
    } catch (e: any) {
      const msg = clerkError(e);
      if (isSessionExistsError(msg)) return;
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const attemptPasskeyVerify = async () => {
    setError(null);
    if (!signIn) return;
    setBusy(true);
    try {
      await signIn.authenticateWithPasskey();
      if (signIn.status === "complete") {
        await setSignInActive({ session: signIn.createdSessionId });
      } else {
        setError("Biometric verification did not complete. You can retry or sign in with email + password.");
      }
    } catch (e: any) {
      setError(clerkError(e) + " You can retry or sign in with email + password.");
    } finally {
      setBusy(false);
    }
  };

  const handleNewDeviceOtp = async () => {
    setError(null);
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit OTP sent to your operator ID.");
      return;
    }
    if (!signIn) return;
    setBusy(true);
    try {
      await signIn.attemptFirstFactor({ strategy: "email_code", code: otp });
      if (signIn.status === "complete") {
        await setSignInActive({ session: signIn.createdSessionId });
      }
      setInfo("Identity verified. You can optionally register a biometric credential on this new device for faster sign-in.");
      setStep("new-device-biometric");
    } catch (e: any) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleNewDeviceBiometric = async () => {
    setError(null);
    if (!passkeysSupported) {
      setError("No biometric hardware found on this device. You can continue without it.");
      return;
    }
    setBusy(true);
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setError("No biometric hardware found on this device. You can continue without it.");
        return;
      }
      const u = clerkUser as any;
      await u?.createPasskey();
      setInfo("Biometric credential registered. You can use it for faster sign-in next time.");
    } catch (e: any) {
      setError(clerkError(e) + " You can continue without biometric.");
    } finally {
      setBusy(false);
    }
  };

  const handleNewDeviceBiometricSkip = () => {
    setError(null);
    setInfo(null);
  };

  const resendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup" && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      } else if (mode === "signin" && signIn) {
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: clerkUser?.primaryEmailAddress?.id ?? "" });
      }
      setInfo(`A new 6-digit numeric code was sent to ${email}.`);
    } catch (e: any) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-cyan-400/40 flex items-center justify-center bg-cyan-400/5">
            <ShieldCheck size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-[0.2em] text-cyan-100">COMMAND CENTER</h1>
            <p className="label-eyebrow-dim">SECURE ACCESS — TIER 3</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-cyan" />
          <span className="label-eyebrow text-emerald-300">ONLINE</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bracket-4 bg-[#07111a]/80 backdrop-blur border border-cyan-400/20 p-8 rounded">
          <span className="b tl" /><span className="b tr" /><span className="b bl" /><span className="b br" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded border border-cyan-400/40 flex items-center justify-center bg-cyan-400/5 mb-3">
              <Lock size={22} className="text-cyan-400" />
            </div>
            <p className="label-eyebrow">AUTHENTICATE</p>
            <h2 className="text-xl font-semibold text-cyan-50 mt-1">Access Command Center</h2>
          </div>

          <div className="flex mb-6 rounded border border-cyan-400/20 overflow-hidden">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 text-xs font-semibold tracking-[0.15em] uppercase transition ${
                mode === "signin" ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 text-xs font-semibold tracking-[0.15em] uppercase transition ${
                mode === "signup" ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign Up
            </button>
          </div>

          <StepIndicator mode={mode} step={step} />

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded border border-cyan-400/30 bg-cyan-400/5 text-cyan-100 text-sm">
              {info}
            </div>
          )}

          {mode === "signin" && step === "credentials" && (
            <div className="space-y-4 fade-in">
              <Field label="OPERATOR ID" icon={<Mail size={14} />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@nic.in"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600"
                />
              </Field>
              <Field label="CIPHER" icon={<KeyRound size={14} />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600"
                />
              </Field>
              <button
                onClick={handleSignin}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {busy ? "VERIFYING…" : "ENGAGE CONSOLE"}
              </button>
            </div>
          )}

          {mode === "signin" && step === "biometric-verify" && (
            <div className="space-y-4 fade-in text-center">
              <div className="w-16 h-16 mx-auto rounded-full border border-cyan-400/40 flex items-center justify-center bg-cyan-400/5">
                <Fingerprint size={28} className="text-cyan-400" />
              </div>
              <p className="text-sm text-cyan-100">
                Complete the biometric prompt to engage the console.
              </p>
              <button
                onClick={attemptPasskeyVerify}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <RefreshCw size={16} />
                {busy ? "PROMPTING…" : "RETRY BIOMETRIC"}
              </button>
              <button
                onClick={async () => {
                  if (!signIn || !clerkUser) return;
                  setStep("new-device-otp");
                  setInfo(`A 6-digit numeric code was sent to ${email}. Enter it to verify identity and register a passkey on this device.`);
                  try {
                    await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: clerkUser.primaryEmailAddress?.id ?? "" });
                  } catch (e: any) {
                    setError(clerkError(e));
                  }
                }}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 underline"
              >
                Use a new device? Verify via OTP
              </button>
              {isSignedIn && (
                <button
                  onClick={handleDifferentAccount}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-amber-300 transition"
                >
                  <LogOut size={12} />
                  Use a different account
                </button>
              )}
            </div>
          )}

          {mode === "signin" && step === "new-device-otp" && (
            <div className="space-y-4 fade-in">
              <Field label="OTP CODE" icon={<KeyRound size={14} />}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600 font-mono tracking-[0.4em]"
                />
              </Field>
              <button
                onClick={handleNewDeviceOtp}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <ArrowRight size={16} />
                {busy ? "VERIFYING…" : "VERIFY IDENTITY"}
              </button>
              <button
                onClick={resendOtp}
                disabled={busy}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 transition"
              >
                Didn't receive a code? Resend
              </button>
            </div>
          )}

          {mode === "signin" && step === "new-device-biometric" && (
            <div className="space-y-4 fade-in text-center">
              <div className="w-16 h-16 mx-auto rounded-full border border-cyan-400/40 flex items-center justify-center bg-cyan-400/5">
                <Fingerprint size={28} className="text-cyan-400" />
              </div>
              <p className="text-sm text-cyan-100">
                Optionally register a biometric credential on this new device for faster sign-in next time.
              </p>
              <button
                onClick={handleNewDeviceBiometric}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <Fingerprint size={16} />
                {busy ? "REGISTERING…" : "SET UP BIOMETRIC"}
              </button>
              <button
                onClick={handleNewDeviceBiometricSkip}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 transition"
              >
                Skip for now
              </button>
            </div>
          )}

          {mode === "signup" && step === "credentials" && (
            <div className="space-y-4 fade-in">
              <Field label="OPERATOR ID" icon={<Mail size={14} />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@nic.in"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600"
                />
              </Field>
              <button
                onClick={handleSignupSendOtp}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <ArrowRight size={16} />
                {busy ? "SENDING…" : "SEND OTP"}
              </button>
            </div>
          )}

          {mode === "signup" && step === "otp" && (
            <div className="space-y-4 fade-in">
              <Field label="OTP CODE" icon={<KeyRound size={14} />}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600 font-mono tracking-[0.4em]"
                />
              </Field>
              <button
                onClick={handleSignupVerifyOtp}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <ArrowRight size={16} />
                {busy ? "VERIFYING…" : "VERIFY EMAIL"}
              </button>
              <button
                onClick={resendOtp}
                disabled={busy}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 transition"
              >
                Didn't receive a code? Resend
              </button>
            </div>
          )}

          {mode === "signup" && step === "password" && (
            <div className="space-y-4 fade-in">
              <Field label="CIPHER" icon={<KeyRound size={14} />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent outline-none text-cyan-50 placeholder-slate-600"
                />
              </Field>
              <button
                onClick={handleSignupSetPassword}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <ArrowRight size={16} />
                {busy ? "SETTING…" : "SET CIPHER"}
              </button>
            </div>
          )}

          {mode === "signup" && step === "biometric-offer" && (
            <div className="space-y-4 fade-in text-center">
              <div className="w-16 h-16 mx-auto rounded-full border border-emerald-400/40 flex items-center justify-center bg-emerald-400/5">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <p className="text-sm text-cyan-100">
                Your account is ready. Enable biometric login for faster sign-in next time?
              </p>
              <button
                onClick={handleSignupRegisterBiometric}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <Fingerprint size={16} />
                {busy ? "PROMPTING…" : "SET UP BIOMETRIC"}
              </button>
              <button
                onClick={handleSignupSkipBiometric}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 transition"
              >
                Skip for now
              </button>
            </div>
          )}

          {mode === "signup" && step === "biometric-register" && (
            <div className="space-y-4 fade-in text-center">
              <div className="w-16 h-16 mx-auto rounded-full border border-cyan-400/40 flex items-center justify-center bg-cyan-400/5">
                <Fingerprint size={28} className="text-cyan-400" />
              </div>
              <p className="text-sm text-cyan-100">
                Register a biometric credential (fingerprint / Face ID) on this device for faster sign-in.
              </p>
              <button
                onClick={handleSignupRegisterBiometric}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded bg-cyan-400/15 border border-cyan-400/50 text-cyan-100 font-semibold tracking-[0.15em] text-sm uppercase hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                <Fingerprint size={16} />
                {busy ? "PROMPTING…" : "REGISTER BIOMETRIC"}
              </button>
              <button
                onClick={handleSignupSkipBiometric}
                className="w-full text-xs text-slate-400 hover:text-cyan-200 transition"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="px-8 py-4 text-center">
        <p className="label-eyebrow-dim">ENERGYRESILIENCE AI · GOVERNMENT OF INDIA · TIER 3</p>
      </footer>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-eyebrow flex items-center gap-1.5 mb-1.5">{icon}{label}</span>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded border border-cyan-400/20 bg-cyan-400/5 focus-within:border-cyan-400/50 transition">
        {children}
      </div>
    </label>
  );
}

function StepIndicator({ mode, step }: { mode: Mode; step: Step }) {
  const signupSteps: { key: Step; label: string }[] = [
    { key: "credentials", label: "VERIFY EMAIL" },
    { key: "otp", label: "ENTER CODE" },
    { key: "password", label: "SET CIPHER" },
    { key: "biometric-offer", label: "BIOMETRIC" },
  ];
  const signinSteps: { key: Step; label: string }[] = [
    { key: "credentials", label: "CREDENTIALS" },
    { key: "biometric-verify", label: "BIOMETRIC" },
  ];
  const signinNewDeviceSteps: { key: Step; label: string }[] = [
    { key: "credentials", label: "CREDENTIALS" },
    { key: "new-device-otp", label: "VERIFY IDENTITY" },
    { key: "new-device-biometric", label: "BIOMETRIC" },
  ];

  let steps = mode === "signup" ? signupSteps : signinSteps;
  if (step === "new-device-otp" || step === "new-device-biometric") steps = signinNewDeviceSteps;
  const currentIndex = steps.findIndex((s) => s.key === step);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center justify-between mb-6 px-1">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400/20 text-cyan-200"
                    : done
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-600 text-slate-600"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[9px] mt-1 tracking-[0.1em] uppercase ${
                  active ? "text-cyan-300" : done ? "text-emerald-400/70" : "text-slate-600"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-4 ${i < currentIndex ? "bg-emerald-400/30" : "bg-slate-700"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
