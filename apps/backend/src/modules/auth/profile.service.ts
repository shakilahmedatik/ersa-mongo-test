import type { UserProfileDto } from "./auth.types";
import { UserProfileModel } from "./profile.model";

const toProfileDto = (profile: InstanceType<typeof UserProfileModel>) => {
  return {
    id: profile.id,
    authUserId: profile.authUserId,
    name: profile.name,
    email: profile.email,
    lastLoginAt: profile.lastLoginAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  } satisfies UserProfileDto;
};

export const userProfileService = {
  async findByAuthUserId(authUserId: string) {
    const profile = await UserProfileModel.findOne({ authUserId }).exec();

    return profile ? toProfileDto(profile) : null;
  },

  async syncFromAuthUser(input: {
    authUserId: string;
    name: string;
    email: string;
    lastLoginAt?: Date;
  }) {
    const profile = await UserProfileModel.findOneAndUpdate(
      { authUserId: input.authUserId },
      {
        $set: {
          name: input.name,
          email: input.email,
          ...(input.lastLoginAt ? { lastLoginAt: input.lastLoginAt } : {}),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    return profile ? toProfileDto(profile) : null;
  },
};
