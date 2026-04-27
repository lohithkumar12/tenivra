"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  tenant_id: string | null;
}

export interface SignupPayload {
  clinic_name: string;
  phone?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export interface PatientSignupPayload {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

export function homeForRole(role: string): string {
  if (role === "super_admin") return "/super";
  if (role === "clinic_admin") return "/admin";
  if (role === "patient") return "/patient/bookings";
  return "/";
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  patientSignup: (payload: PatientSignupPayload) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null, token: null, loading: true,
  login: async () => { throw new Error("not ready"); },
  signup: async () => { throw new Error("not ready"); },
  patientSignup: async () => { throw new Error("not ready"); },
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

  const signup = async (payload: SignupPayload): Promise<User> => {
    const res = await api.post<{ access_token: string; user: User }>("/api/auth/signup", payload);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("tenivra_token", res.access_token);
    return res.user;
  };

  const patientSignup = async (payload: PatientSignupPayload): Promise<User> => {
    const res = await api.post<{ access_token: string; user: User }>("/api/auth/patient/signup", payload);
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

  return <Ctx.Provider value={{ user, token, loading, login, signup, patientSignup, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
