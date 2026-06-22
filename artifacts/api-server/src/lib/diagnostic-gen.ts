import { chatJson } from "./ai";
import type { QuestionFormat } from "./assessments";

export type GeneratedDiagnosticQuestion = {
  format: QuestionFormat;
  prompt: string;
  choices: string[] | null; // 4 options for mc; null for written
  correctAnswer: string; // mc: the exact correct option text
  explanation: string;
};

const SHARED_RULES =
  "This is a developmental-mathematics diagnostic. Use $...$ for inline LaTeX in the prompt and choices. " +
  "Keep the question self-contained and unambiguous. The answer MUST be a short piece of math notation " +
  "(a number, fraction, exponent, percent, expression, or equation) — never multi-paragraph.";

async function generateMc(
  topicTitle: string,
  scopeHint: string,
  avoidTexts: string[],
): Promise<GeneratedDiagnosticQuestion> {
  const out = await chatJson<{
    prompt: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  }>(
    `You generate ONE multiple-choice developmental-mathematics question on the topic "${topicTitle}". ${SHARED_RULES} ` +
      `${scopeHint} ` +
      `Provide exactly 4 distinct answer choices, exactly one correct, with plausible distractors based on common mistakes. ` +
      `It MUST differ in numbers and wording from every item in this avoid-list: ${JSON.stringify(
        avoidTexts.slice(0, 24),
      )}. ` +
      `Respond as strict JSON: {"prompt": string, "choices": [string, string, string, string], "correctIndex": number, "explanation": string}.`,
    `Generate a fresh multiple-choice question on ${topicTitle}.`,
  );
  const choices = Array.isArray(out.choices) ? out.choices.slice(0, 4) : [];
  const idx =
    typeof out.correctIndex === "number" &&
    out.correctIndex >= 0 &&
    out.correctIndex < choices.length
      ? out.correctIndex
      : 0;
  return {
    format: "mc",
    prompt: out.prompt,
    choices,
    correctAnswer: choices[idx] ?? "",
    explanation: out.explanation,
  };
}

async function generateWritten(
  topicTitle: string,
  scopeHint: string,
  avoidTexts: string[],
): Promise<GeneratedDiagnosticQuestion> {
  const out = await chatJson<{
    prompt: string;
    correctAnswer: string;
    explanation: string;
  }>(
    `You generate ONE written-answer developmental-mathematics question on the topic "${topicTitle}". ${SHARED_RULES} ` +
      `${scopeHint} The student must WRITE the answer in proper math notation (not pick from options). ` +
      `It MUST differ in numbers and wording from every item in this avoid-list: ${JSON.stringify(
        avoidTexts.slice(0, 24),
      )}. ` +
      `Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string}.`,
    `Generate a fresh written-answer question on ${topicTitle}.`,
  );
  return {
    format: "written",
    prompt: out.prompt,
    choices: null,
    correctAnswer: out.correctAnswer,
    explanation: out.explanation,
  };
}

export async function generateDiagnosticQuestion(
  format: QuestionFormat,
  topicTitle: string,
  scopeHint: string,
  avoidTexts: string[],
): Promise<GeneratedDiagnosticQuestion> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const q =
        format === "mc"
          ? await generateMc(topicTitle, scopeHint, avoidTexts)
          : await generateWritten(topicTitle, scopeHint, avoidTexts);
      if (q.prompt.trim().length > 0 && q.correctAnswer.trim().length > 0) {
        if (format === "mc" && (!q.choices || q.choices.length < 2)) continue;
        return q;
      }
    } catch {
      // retry
    }
  }
  // History-aware arithmetic fallback keeps the assessment usable if the model
  // stalls, while guaranteeing the prompt differs from every prior item (so
  // "fresh questions each retake" holds even on the fallback path). We scan the
  // full operand space deterministically from a random start offset and take
  // the first prompt not already in avoidTexts — a hard guarantee of non-reuse
  // unless the entire space is exhausted (far larger than any attempt history).
  const seen = new Set(avoidTexts.map((t) => t.trim()));
  const promptFor = (x: number, y: number) =>
    format === "mc"
      ? `Practice (${topicTitle}): What is $${x} + ${y}$?`
      : `Practice (${topicTitle}): Compute $${x} + ${y}$ and write the result.`;
  const aRange = 79; // a in 11..89
  const bRange = 18; // b in 2..19
  const space = aRange * bRange;
  const start = Math.floor(Math.random() * space);
  let a = 11;
  let b = 2;
  for (let i = 0; i < space; i++) {
    const k = (start + i) % space;
    a = 11 + (k % aRange);
    b = 2 + Math.floor(k / aRange);
    if (!seen.has(promptFor(a, b).trim())) break;
  }
  const sum = a + b;
  if (format === "mc") {
    const distractors = [sum - 1, sum + 1, sum + b];
    const options = [sum, ...distractors]
      .map((n) => `$${n}$`)
      // Shuffle so the correct slot varies.
      .sort(() => Math.random() - 0.5);
    return {
      format: "mc",
      prompt: promptFor(a, b),
      choices: options,
      correctAnswer: `$${sum}$`,
      explanation: `Add the two numbers: $${a} + ${b} = ${sum}$.`,
    };
  }
  return {
    format: "written",
    prompt: promptFor(a, b),
    choices: null,
    correctAnswer: `${sum}`,
    explanation: `Add the two numbers: $${a} + ${b} = ${sum}$.`,
  };
}
