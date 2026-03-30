export type SignUpInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
};

export type SessionData = {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SessionPayload = {
  session: SessionData;
  user: AuthUser;
};

export type SignUpResult = {
  token: string | null;
  user: AuthenticatedUser;
};

export type LoginResult = {
  token: string;
  redirect: boolean;
  url?: string;
  user: AuthenticatedUser;
};

export type UserProfileDto = {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
