import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { submissionCreateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const result = await requireUser();
    if ("response" in result) return result.response;
    const submissions = await prisma.submission.findMany({ where: { userId: result.user.id }, include: { task: { select: { id: true, title: true, initiativeId: true } }, evaluations: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, overallScore: true, summary: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ submissions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireUser();
    if ("response" in result) return result.response;
    const data = submissionCreateSchema.parse(await request.json());
    const task = await prisma.task.findFirst({ where: { id: data.taskId, status: "PUBLISHED", initiative: { memberships: { some: { userId: result.user.id, status: "ACTIVE" } } } }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Task is unavailable or you are not a member" }, { status: 403 });
    const latest = await prisma.submission.findFirst({ where: { taskId: data.taskId, userId: result.user.id }, orderBy: { version: "desc" }, select: { version: true } });
    const submission = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.submission.create({ data: { taskId: data.taskId, userId: result.user.id, version: (latest?.version ?? 0) + 1, content: data.content, url: data.url, status: "SUBMITTED", submittedAt: new Date(), media: { create: data.media } }, include: { media: true } });
      await tx.auditEvent.create({ data: { actorId: result.user.id, action: "SUBMISSION_CREATED", entityType: "Submission", entityId: created.id } });
      return created;
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
