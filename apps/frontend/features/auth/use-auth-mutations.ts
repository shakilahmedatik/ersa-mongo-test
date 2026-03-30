"use client";

import { useMutation } from "@tanstack/react-query";
import type { SignInValues, SignUpValues } from "./auth.types";
import { authClient } from "./auth-client";

const resolveAuthError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: async (values: SignInValues) => {
      const response = await authClient.signIn.email(values);

      if (response.error) {
        throw new Error(response.error.message || "Unable to sign in.");
      }

      return response.data;
    },
    meta: {
      getErrorMessage: resolveAuthError,
    },
  });
};

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: async (values: SignUpValues) => {
      const response = await authClient.signUp.email(values);

      if (response.error) {
        throw new Error(response.error.message || "Unable to create account.");
      }

      return response.data;
    },
    meta: {
      getErrorMessage: resolveAuthError,
    },
  });
};

export const useSignOutMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await authClient.signOut();

      if (response.error) {
        throw new Error(response.error.message || "Unable to sign out.");
      }

      return response.data;
    },
    meta: {
      getErrorMessage: resolveAuthError,
    },
  });
};
