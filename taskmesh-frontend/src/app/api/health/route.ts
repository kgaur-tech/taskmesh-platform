import { NextResponse } from "next/server";

export function GET() {
  const requiredChecks = {
    database: Boolean(process.env.DATABASE_URL),
    googleAuth: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  };
  const optionalChecks = {
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    evaluation: Boolean(process.env.AI_PROVIDER && process.env.AI_PROVIDER_KEY)
  };
  const ready = Object.values(requiredChecks).every(Boolean);
  return NextResponse.json(
    {
      status: ready ? "ready" : "configuration_required",
      checks: { ...requiredChecks, ...optionalChecks },
      optionalServices: optionalChecks
    },
    { status: ready ? 200 : 503 },
  );
}

