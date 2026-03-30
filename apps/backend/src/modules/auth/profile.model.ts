import mongoose, { Schema } from "mongoose";

type UserProfileDocument = {
  authUserId: string;
  name: string;
  email: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const userProfileSchema = new Schema<UserProfileDocument>(
  {
    authUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const UserProfileModel =
  mongoose.models.UserProfile ??
  mongoose.model<UserProfileDocument>("UserProfile", userProfileSchema);
