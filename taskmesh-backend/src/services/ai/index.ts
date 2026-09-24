import OpenAI from "openai";

function openAIClient() {
  const apiKey =
    process.env.OPENAI_API_KEY ??
    process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured",
    );
  }

  return new OpenAI({ apiKey });
}

export type EvaluationInput = {
  initiative: {
    name: string;
    evaluationRubric: unknown;
  };

  submission: {
    content: string | null;
    transcript?: string | null;
    programmingLanguage?: string | null;
    type: string;
  };
};

export type EvaluationResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvements: string[];
  source: "AI";
};

type AIResponse = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  improvements: string[];
};

function getSubmissionText(
  submission: EvaluationInput["submission"],
): string {
  if (
    submission.transcript &&
    submission.transcript.trim().length > 0
  ) {
    return submission.transcript.trim();
  }

  if (
    submission.content &&
    submission.content.trim().length > 0
  ) {
    return submission.content.trim();
  }

  return "";
}

function isDSASubmission(
  submission: EvaluationInput["submission"],
): boolean {
  return (
    submission.type === "CODE" ||
    Boolean(
      submission.programmingLanguage &&
        submission.programmingLanguage.trim(),
    )
  );
}

function cleanAIResponse(
  value: unknown,
): AIResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "OpenAI returned an invalid evaluation",
    );
  }

  const data =
    value as Record<string, unknown>;

  const score =
    typeof data.score === "number"
      ? data.score
      : Number(data.score);

  const strengths = Array.isArray(
    data.strengths,
  )
    ? data.strengths.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

  const weaknesses = Array.isArray(
    data.weaknesses,
  )
    ? data.weaknesses.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

  const improvements = Array.isArray(
    data.improvements,
  )
    ? data.improvements.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

  const feedback =
    typeof data.feedback === "string"
      ? data.feedback
      : "";

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    throw new Error(
      "OpenAI returned an invalid score",
    );
  }

  return {
    score: Math.round(score),
    strengths,
    weaknesses,
    feedback,
    improvements,
  };
}

function buildEnglishPrompt(
  input: EvaluationInput,
  submissionText: string,
): string {
  return `
You are an English speaking and communication evaluator.

Analyze the student's English speech transcript.

Initiative:
${input.initiative.name}

Transcript:
"""
${submissionText}
"""

Evaluate the student's English based on:

1. Grammar
2. Sentence structure
3. Vocabulary
4. Word choice
5. Punctuation/transcript clarity
6. Fluency
7. Natural phrasing
8. Overall communication quality

Important:
- Do NOT judge the student's intelligence.
- Do NOT invent mistakes that are not present.
- Identify actual mistakes or weak areas from the transcript.
- Give practical corrections.
- Keep the feedback understandable for a student.
- If the transcript is already good, say so.
- Score from 0 to 100.

Return ONLY JSON with exactly these fields:

{
  "score": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "string",
  "improvements": ["string"]
}

The score should represent the overall quality of the student's English performance.
`;
}

function buildDSAPrompt(
  input: EvaluationInput,
  submissionText: string,
): string {
  const language =
    input.submission
      .programmingLanguage ??
    "Unknown";

  return `
You are a DSA and programming interview evaluator.

Analyze the student's submitted code.

Programming language:
${language}

Initiative:
${input.initiative.name}

Student code:
"""
${submissionText}
"""

Evaluate the code on:

1. Correctness
2. Bugs
3. Algorithm choice
4. Time complexity
5. Space complexity
6. Edge cases
7. Optimization opportunities
8. Code quality
9. Readability
10. Interview readiness

Important:
- Do not invent bugs.
- If the algorithm is correct, explicitly say that.
- Explain actual bugs clearly.
- Give the expected time complexity.
- Give the expected space complexity.
- Suggest a better approach only when there is a meaningful improvement.
- Keep feedback understandable for a student.
- Score from 0 to 100.

Return ONLY JSON with exactly these fields:

{
  "score": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "string",
  "improvements": ["string"]
}

The score should represent the quality of the submitted solution.
`;
}

export async function evaluateSubmission(
  input: EvaluationInput,
): Promise<EvaluationResult> {
  const submissionText =
    getSubmissionText(input.submission);

  if (!submissionText) {
    throw new Error(
      "Submission has no content to evaluate",
    );
  }

  const dsa =
    isDSASubmission(
      input.submission,
    );

  const prompt = dsa
    ? buildDSAPrompt(
        input,
        submissionText,
      )
    : buildEnglishPrompt(
        input,
        submissionText,
      );

  try {
    const openai = openAIClient();
    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        input: [
          {
            role: "system",
            content:
              "You are a precise educational evaluator. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name: "evaluation",
            strict: true,
            schema: {
              type: "object",

              properties: {
                score: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                },

                strengths: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                weaknesses: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },

                feedback: {
                  type: "string",
                },

                improvements: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },

              required: [
                "score",
                "strengths",
                "weaknesses",
                "feedback",
                "improvements",
              ],

              additionalProperties: false,
            },
          },
        },
      });

    const output =
      response.output_text;

    if (!output) {
      throw new Error(
        "OpenAI returned an empty evaluation",
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(
        "OpenAI returned invalid JSON",
      );
    }

    const cleaned =
      cleanAIResponse(parsed);

    return {
      ...cleaned,
      source: "AI",
    };
  } catch (error) {
    console.error(
      "OpenAI evaluation failed:",
      error,
    );

    if (error instanceof Error) {
      throw new Error(
        `AI evaluation failed: ${error.message}`,
      );
    }

    throw new Error(
      "AI evaluation failed",
    );
  }
}
