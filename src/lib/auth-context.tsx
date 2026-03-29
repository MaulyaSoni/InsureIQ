import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Stub user type — replace with Supabase User when connected
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with supabase.auth.onAuthStateChange + getSession
    const stored = localStorage.getItem("insureiq_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    // TODO: Replace with supabase.auth.signInWithPassword({ email, password })
    const mockUser: AuthUser = { id: `user-${Date.now()}`, email, name: email.split("@")[0] };
    setUser(mockUser);
    localStorage.setItem("insureiq_user", JSON.stringify(mockUser));
  };

  const signup = async (email: string, _password: string, name?: string) => {
    // TODO: Replace with supabase.auth.signUp({ email, password })
    const mockUser: AuthUser = { id: `user-${Date.now()}`, email, name: name || email.split("@")[0] };
    setUser(mockUser);
    localStorage.setItem("insureiq_user", JSON.stringify(mockUser));
  };

  const logout = async () => {
    // TODO: Replace with supabase.auth.signOut()
    setUser(null);
    localStorage.removeItem("insureiq_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
