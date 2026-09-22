import { apiClient, tokenStorage } from "./client";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER" | "APPLICANT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "RECRUITER" | "APPLICANT";
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

// Predefined demo recruiter for UI testing and fallback when backend is in development
export const DEMO_RECRUITER_USER: UserResponse = {
  id: "usr-demo-recruiter-01",
  name: "Amanuel Kebede",
  email: "recruiter@smarthire.internal",
  role: "RECRUITER",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const authApi = {
  async login(input: LoginInput): Promise<AuthResponse> {
    const result = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    tokenStorage.setAccessToken(result.tokens.accessToken);
    tokenStorage.setRefreshToken(result.tokens.refreshToken);
    return result;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const result = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    tokenStorage.setAccessToken(result.tokens.accessToken);
    tokenStorage.setRefreshToken(result.tokens.refreshToken);
    return result;
  },

  async getMe(): Promise<{ user: UserResponse }> {
    return apiClient<{ user: UserResponse }>("/auth/me", {
      method: "GET",
    });
  },

  async logout(): Promise<void> {
    try {
      await apiClient<{ message: string }>("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore logout request errors
    } finally {
      tokenStorage.clear();
    }
  },

  async refreshTokens(): Promise<AuthTokens> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const result = await apiClient<{ tokens: AuthTokens }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    tokenStorage.setAccessToken(result.tokens.accessToken);
    tokenStorage.setRefreshToken(result.tokens.refreshToken);
    return result.tokens;
  },

  async getSessions(): Promise<{ sessions: SessionInfo[] }> {
    try {
      return await apiClient<{ sessions: SessionInfo[] }>("/auth/sessions", {
        method: "GET",
      });
    } catch {
      return { sessions: [] };
    }
  },
};

