import { OAuth2Client } from "google-auth-library";
import type { IncomingMessage } from "node:http";
import { UserRole } from "@prisma/client";
import { prisma } from "../database";

export type AuthenticatedTaskMeshUser = {
  id: string;
  googleId: string | null;
  email: string;
  name: string | null;
  role: UserRole;
};

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}

function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AuthenticationError("Google OAuth is not configured on the API server");
  return new OAuth2Client(clientId);
}

function bearerToken(request: IncomingMessage) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AuthenticationError("A Google ID token is required");
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError("A Google ID token is required");
  return token;
}

/** Verifies a Google ID token and safely links the subject to MongoDB. */
export async function requireAuthenticatedUser(request: IncomingMessage): Promise<AuthenticatedTaskMeshUser> {
  const client = googleClient();
  const token = bearerToken(request);

  let payload: { sub: string; email?: string | null; name?: string | null };
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload() as typeof payload;
  } catch {
    throw new AuthenticationError("Invalid or expired Google session token");
  }

  if (!payload?.sub) throw new AuthenticationError("Google session has no user identity");

  const email = payload.email;
  if (!email) throw new AuthenticationError("Google account does not have a primary email address");

  const name = payload.name ?? null;
  const existing = await prisma.user.findUnique({ where: { googleId: payload.sub } })
    ?? await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { googleId: payload.sub, name: name ?? existing.name },
      select: { id: true, googleId: true, email: true, name: true, role: true },
    }) as Promise<AuthenticatedTaskMeshUser>;
  }

  return prisma.user.create({
    data: { googleId: payload.sub, email, name, role: UserRole.STUDENT },
    select: { id: true, googleId: true, email: true, name: true, role: true },
  }) as Promise<AuthenticatedTaskMeshUser>;
}

export function requireRole(user: AuthenticatedTaskMeshUser, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) throw new AuthorizationError("You do not have permission for this action");
}
