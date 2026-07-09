import { AuthProvider, useAuth } from "./lib/auth";
import LoginPage from "./pages/LoginPage";
import CommandCenter from "./pages/CommandCenter";

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="label-eyebrow text-cyan-300">INITIALIZING SECURE CONSOLE…</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <CommandCenter />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
