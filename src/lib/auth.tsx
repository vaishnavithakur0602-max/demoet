import { createContext, useContext, ReactNode, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

interface AuthState {
  user: { id: string; email: string } | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const mappedUser = isSignedIn && user
    ? { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? "" }
    : null;

  const signOut = useCallback(() => {
    clerkSignOut();
  }, [clerkSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        loading: !isLoaded,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
