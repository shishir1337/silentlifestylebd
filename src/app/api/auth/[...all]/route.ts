import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * better-auth's endpoints: sign-in, sign-up, sign-out, session, password reset.
 *
 * A Route Handler rather than Server Actions because these have to be
 * addressable by URL — the client library calls them, and a password-reset
 * link in an email has to land somewhere. This is the one place the plan
 * allows an HTTP API; everything else the app does is a Server Action.
 */
export const { GET, POST } = toNextJsHandler(auth);
