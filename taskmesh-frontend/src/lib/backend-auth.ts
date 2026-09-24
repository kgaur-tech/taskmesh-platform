import { createHmac } from "node:crypto";

type BackendIdentity = {
  email: string;
  name?: string | null;
  googleId?: string | null;
  issuedAt: number;
};

export function backendIdentityHeader(identity: Omit<BackendIdentity, "issuedAt">) {
  const secret = process.env.BACKEND_AUTH_SECRET;
  if (!secret) throw new Error("Backend session bridge is not configured");

  const payload = Buffer.from(JSON.stringify({ ...identity, issuedAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
