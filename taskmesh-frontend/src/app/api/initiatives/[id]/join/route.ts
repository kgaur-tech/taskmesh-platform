import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireUser();
    if ("response" in result) return result.response;
    const { id } = await params;
    const initiative = await prisma.initiative.findUnique({ where: { id }, select: { id: true, status: true, visibility: true, participantLimit: true } });
    if (!initiative || !["PUBLISHED", "ACTIVE"].includes(initiative.status)) return NextResponse.json({ error: "Initiative is not open for joining" }, { status: 404 });
    if (initiative.visibility === "PRIVATE") return NextResponse.json({ error: "This initiative requires an invite" }, { status: 403 });
    const existing = await prisma.initiativeMembership.findUnique({ where: { userId_initiativeId: { userId: result.user.id, initiativeId: id } } });
    if (existing?.status === "ACTIVE") return NextResponse.json({ membership: existing });
    const count = await prisma.initiativeMembership.count({ where: { initiativeId: id, status: "ACTIVE" } });
    if (initiative.participantLimit && count >= initiative.participantLimit) return NextResponse.json({ error: "Initiative is full" }, { status: 409 });
    const membership = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const joined = await tx.initiativeMembership.upsert({
        where: { userId_initiativeId: { userId: result.user.id, initiativeId: id } },
        create: { userId: result.user.id, initiativeId: id },
        update: { status: "ACTIVE", leftAt: null }
      });
      await tx.progress.upsert({ where: { userId_initiativeId: { userId: result.user.id, initiativeId: id } }, create: { userId: result.user.id, initiativeId: id }, update: {} });
      await tx.streak.upsert({ where: { userId_initiativeId: { userId: result.user.id, initiativeId: id } }, create: { userId: result.user.id, initiativeId: id }, update: {} });
      return joined;
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

