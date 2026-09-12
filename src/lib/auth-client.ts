"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth.
 *
 * `useSession()` here is for *appearance only* — greeting someone by name,
 * swapping "Sign in" for "Account". It fetches after mount, which is what
 * keeps every storefront page prerendered as static HTML: reading the session
 * on the server in the shared header would make all 34 of them render per
 * request.
 *
 * It is never a permission check. What this hook reports is what the browser
 * believes; what the server enforces comes from `dal.ts`.
 */
export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;
