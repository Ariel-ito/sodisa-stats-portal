export interface Company {
  id: number;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "support" | "client";
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  companies: Company[];
}

export interface PortalSession {
  user: AuthUser;
  companies: Company[];
}
