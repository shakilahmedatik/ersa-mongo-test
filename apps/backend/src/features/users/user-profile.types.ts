export type UserProfileDto = {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
