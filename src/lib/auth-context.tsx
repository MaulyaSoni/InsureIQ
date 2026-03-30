import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { clearAuthToken, loginApi, persistAuthToken, signupApi } from "@/lib/api";

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
    const stored = localStorage.getItem("insureiq_user");
    const token = localStorage.getItem("insureiq_token");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    if (!token) {
      localStorage.removeItem("insureiq_user");
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    const authUser: AuthUser = {
      id: String(res.user.id),
      email: res.user.email,
      name: res.user.name,
    };
    persistAuthToken(res.access_token);
    setUser(authUser);
    localStorage.setItem("insureiq_user", JSON.stringify(authUser));
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await signupApi(email, password, name);
    const authUser: AuthUser = {
      id: String(res.user.id),
      email: res.user.email,
      name: res.user.name,
    };
    persistAuthToken(res.access_token);
    setUser(authUser);
    localStorage.setItem("insureiq_user", JSON.stringify(authUser));
  };

  const logout = async () => {
    clearAuthToken();
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
