import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { response: NextResponse.json({ error: "User profile is not synchronized" }, { status: 403 }) } as const;
  }

  return { user } as const;
}

export async function requireRole(roles: Array<"PARTICIPANT" | "LEADER" | "ADMIN">) {
  const result = await requireUser();
  if ("response" in result) return result;
  if (!roles.includes(result.user.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return result;
}

