import { OAuth2Client } from "google-auth-library";
import { createHmac, timingSafeEqual } from "node:crypto";
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

type ServiceIdentity = {
  email: string;
  name?: string | null;
  googleId?: string | null;
  issuedAt: number;
};

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

function serviceAuthSecret() {
  const secret = process.env.BACKEND_AUTH_SECRET;
  if (!secret) throw new AuthenticationError("Backend session bridge is not configured");
  return secret;
}

function verifiedServiceIdentity(request: IncomingMessage): ServiceIdentity | null {
  const token = request.headers["x-taskmesh-identity"];
  if (typeof token !== "string") return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new AuthenticationError("Invalid backend session assertion");

  const expectedSignature = createHmac("sha256", serviceAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AuthenticationError("Invalid backend session assertion");
  }

  let identity: ServiceIdentity;
  try {
    identity = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ServiceIdentity;
  } catch {
    throw new AuthenticationError("Invalid backend session assertion");
  }

  if (!identity.email || !Number.isFinite(identity.issuedAt) || Date.now() - identity.issuedAt > 5 * 60 * 1000 || identity.issuedAt > Date.now() + 60_000) {
    throw new AuthenticationError("Expired backend session assertion");
  }

  return identity;
}

async function upsertAuthenticatedUser(identity: Omit<ServiceIdentity, "issuedAt">): Promise<AuthenticatedTaskMeshUser> {
  const existing = identity.googleId
    ? await prisma.user.findUnique({ where: { googleId: identity.googleId } }) ?? await prisma.user.findUnique({ where: { email: identity.email } })
    : await prisma.user.findUnique({ where: { email: identity.email } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { googleId: identity.googleId ?? existing.googleId, name: identity.name ?? existing.name },
      select: { id: true, googleId: true, email: true, name: true, role: true },
    }) as Promise<AuthenticatedTaskMeshUser>;
  }

  return prisma.user.create({
    data: { googleId: identity.googleId ?? null, email: identity.email, name: identity.name ?? null, role: UserRole.STUDENT },
    select: { id: true, googleId: true, email: true, name: true, role: true },
  }) as Promise<AuthenticatedTaskMeshUser>;
}

/** Verifies a Google ID token and safely links the subject to MongoDB. */
export async function requireAuthenticatedUser(request: IncomingMessage): Promise<AuthenticatedTaskMeshUser> {
  const serviceIdentity = verifiedServiceIdentity(request);
  if (serviceIdentity) {
    return upsertAuthenticatedUser(serviceIdentity);
  }

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

  return upsertAuthenticatedUser({ googleId: payload.sub, email, name: payload.name ?? null });
}

export function requireRole(user: AuthenticatedTaskMeshUser, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) throw new AuthorizationError("You do not have permission for this action");
}
