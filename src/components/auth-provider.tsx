"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEMO_SESSION_KEY,
  DEMO_USERS_KEY,
  seedUsers,
  type DemoRole,
  type DemoUser,
} from "@/lib/auth";

type PublicUser = Omit<DemoUser, "password">;

type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  register: (input: {
    name: string;
    email: string;
    password: string;
    institution: string;
    role: DemoRole;
    orcid?: string;
  }) => { ok: boolean; error?: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toPublic(user: DemoUser): PublicUser {
  const { password: _p, ...rest } = user;
  return rest;
}

function readUsers(): DemoUser[] {
  if (typeof window === "undefined") return seedUsers;
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(seedUsers));
      return seedUsers;
    }
    return JSON.parse(raw) as DemoUser[];
  } catch {
    return seedUsers;
  }
}

function writeUsers(users: DemoUser[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readUsers();
    try {
      const session = localStorage.getItem(DEMO_SESSION_KEY);
      if (session) setUser(JSON.parse(session) as PublicUser);
    } catch {
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
    setReady(true);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const users = readUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!found || found.password !== password) {
      return { ok: false, error: "Invalid email or password." };
    }
    const pub = toPublic(found);
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(pub));
    setUser(pub);
    return { ok: true };
  }, []);

  const register = useCallback(
    (input: {
      name: string;
      email: string;
      password: string;
      institution: string;
      role: DemoRole;
      orcid?: string;
    }) => {
      const users = readUsers();
      if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        return { ok: false, error: "An account with this email already exists." };
      }
      if (input.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }
      const next: DemoUser = {
        id: `u-${Date.now()}`,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        role: input.role,
        institution: input.institution.trim(),
        orcid: input.orcid?.trim() || undefined,
        researchInterests: [],
      };
      writeUsers([...users, next]);
      const pub = toPublic(next);
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(pub));
      setUser(pub);
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // ignore storage errors in demo
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
