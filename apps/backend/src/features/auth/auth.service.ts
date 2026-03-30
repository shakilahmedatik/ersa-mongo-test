import { getEnv } from "../../config/env";
import { getAuth } from "../../infrastructure/auth/better-auth";
import { userProfileService } from "../users/user-profile.service";
import type {
  LoginInput,
  LoginResult,
  SessionPayload,
  SignUpInput,
  SignUpResult,
} from "./auth.types";

const jsonHeaders = (headers: Headers) => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("content-type", "application/json");

  return nextHeaders;
};

const createBetterAuthRequest = (
  request: Request,
  path: string,
  method: string,
  body?: SignUpInput | LoginInput,
) => {
  const env = getEnv();

  return new Request(new URL(path, env.betterAuthUrl).toString(), {
    method,
    headers: body ? jsonHeaders(request.headers) : request.headers,
    body: body ? JSON.stringify(body) : undefined,
  });
};

const withResponseHeaders = <T>(response: Response, payload: T) => {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify(payload), {
    status: response.status,
    headers,
  });
};

export const authService = {
  async getSession(headers: Headers) {
    const auth = await getAuth();

    return auth.api.getSession({ headers });
  },

  async signUp(request: Request, input: SignUpInput) {
    const auth = await getAuth();
    const response = await auth.handler(
      createBetterAuthRequest(
        request,
        "/api/auth/sign-up/email",
        "POST",
        input,
      ),
    );

    if (!response.ok) {
      return response;
    }

    const payload = (await response.clone().json()) as SignUpResult;
    const profile = await userProfileService.syncFromAuthUser({
      authUserId: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
    });

    return withResponseHeaders(response, {
      ...payload,
      profile,
    });
  },

  async login(request: Request, input: LoginInput) {
    const auth = await getAuth();
    const response = await auth.handler(
      createBetterAuthRequest(
        request,
        "/api/auth/sign-in/email",
        "POST",
        input,
      ),
    );

    if (!response.ok) {
      return response;
    }

    const payload = (await response.clone().json()) as LoginResult;
    const profile = await userProfileService.syncFromAuthUser({
      authUserId: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      lastLoginAt: new Date(),
    });

    return withResponseHeaders(response, {
      ...payload,
      profile,
    });
  },

  async logout(request: Request) {
    const auth = await getAuth();

    return auth.handler(
      createBetterAuthRequest(request, "/api/auth/sign-out", "POST"),
    );
  },

  async getCurrentSession(authUserId: string, sessionPayload: SessionPayload) {
    const profile = await userProfileService.findByAuthUserId(authUserId);

    return {
      ...sessionPayload,
      profile,
    };
  },

  async handleBetterAuth(request: Request) {
    const auth = await getAuth();

    return auth.handler(request);
  },
};
