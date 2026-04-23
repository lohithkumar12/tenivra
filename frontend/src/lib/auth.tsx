"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string | null;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null, token: null, loading: true,
  login: async () => { throw new Error("not ready"); },
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("tenivra_token");
    if (saved) {
      setToken(saved);
      api.get<User>("/api/auth/me", saved)
        .then(setUser)
        .catch(() => { localStorage.removeItem("tenivra_token"); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<{ access_token: string; user: User }>("/api/auth/login", { email, password });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("tenivra_token", res.access_token);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("tenivra_token");
  };

  return <Ctx.Provider value={{ user, token, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
