import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { evaluationResultSchema, getEvaluationProvider } from "@/lib/evaluation";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await requireUser();
    if ("response" in result) return result.response;
    const submission = await prisma.submission.findFirst({ where: { id, OR: [{ userId: result.user.id }, { task: { initiative: { ownerId: result.user.id } } }] }, include: { task: { include: { initiative: { select: { objective: true, title: true } } } }, evaluations: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    const existingEvaluation = submission.evaluations[0];
    if (existingEvaluation?.status === "PROCESSING" || existingEvaluation?.status === "QUEUED") return NextResponse.json({ error: "Evaluation already in progress" }, { status: 409 });
    if (existingEvaluation?.status === "COMPLETED") return NextResponse.json({ evaluation: existingEvaluation });
    const rubric = await prisma.rubric.findUnique({ where: { initiativeId: submission.task.initiativeId }, include: { criteria: { where: { enabled: true } } } });
    if (!rubric || rubric.criteria.length === 0) return NextResponse.json({ error: "This initiative has no enabled evaluation rubric" }, { status: 422 });
    const criterionById = new Map<string, (typeof rubric.criteria)[number]>(rubric.criteria.map((criterion) => [criterion.id, criterion]));
    const evaluation = await prisma.evaluation.upsert({
      where: { evaluationKey: id },
      create: { evaluationKey: id, submissionId: id, rubricId: rubric.id, status: "PROCESSING" },
      update: { rubricId: rubric.id, status: "PROCESSING", errorCode: null, errorMessage: null, completedAt: null }
    });
    try {
      const raw = await getEvaluationProvider().evaluate({ taskInstructions: submission.task.instructions ?? submission.task.description, initiativeContext: `${submission.task.initiative.title}: ${submission.task.initiative.objective}`, rubric: rubric.criteria, submission: { content: submission.content, url: submission.url } });
      const parsed = evaluationResultSchema.parse(raw);
      if (parsed.criterionScores.some((item) => !criterionById.has(item.criterionId) || item.score > (criterionById.get(item.criterionId)?.maxScore ?? 0))) {
        throw new Error("Provider returned an invalid rubric criterion score");
      }
      const completed = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.evaluation.update({ where: { id: evaluation.id }, data: { status: "COMPLETED", overallScore: parsed.overallScore, summary: parsed.summary, strengths: parsed.strengths, weaknesses: parsed.weaknesses, recommendations: parsed.recommendations, confidence: parsed.confidence, completedAt: new Date(), criterionScores: { deleteMany: {}, create: parsed.criterionScores } }, include: { criterionScores: true } });
        await tx.submission.update({ where: { id }, data: { status: "EVALUATED" } });
        await tx.notification.create({ data: { userId: submission.userId, type: "EVALUATION_COMPLETED", title: "Evaluation completed", body: "Your submission has a structured evaluation ready to review.", metadata: { submissionId: id } } });
        return updated;
      });
      return NextResponse.json({ evaluation: completed });
    } catch (error) {
      await prisma.$transaction([
        prisma.evaluation.update({ where: { id: evaluation.id }, data: { status: "FAILED", errorCode: "EVALUATION_FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Provider failure" } }),
        prisma.submission.update({ where: { id }, data: { status: "FAILED" } })
      ]);
      return NextResponse.json({ error: "Evaluation could not be completed", evaluationId: evaluation.id }, { status: 503 });
    }
  } catch (error) {
    return apiError(error);
  }
}
