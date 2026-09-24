import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { userSyncSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const data = userSyncSchema.parse(await request.json());
    const profile = {
      email: userEmail,
      name: session.user?.name ?? userEmail,
      avatarUrl: session.user?.image ?? null,
      timezone: data.timezone,
      googleId: session.user?.googleId ?? null,
    };

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      create: {
        ...profile,
        role: "PARTICIPANT",
      },
      update: profile,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
