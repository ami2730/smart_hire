"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  UserResponse,
  LoginInput,
  RegisterInput,
  DEMO_RECRUITER_USER,
} from "@/lib/api/auth.api";
import { tokenStorage } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const refreshUser = React.useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { user } = await authApi.getMe();
      setUser(user);
    } catch (err) {
      // If token expired or invalid, clear token
      tokenStorage.clear();
      queryClient.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  React.useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
    } else {
      refreshUser();
    }
  }, [refreshUser]);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(input);
      queryClient.clear();
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (input: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(input);
      queryClient.clear();
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      tokenStorage.clear();
      queryClient.clear();
      setUser(null);
      setIsLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.push("/login");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register: registerUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
