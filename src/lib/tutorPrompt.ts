export interface QuestionContext {
  questionNumber: number;
  section: string;
  moduleNumber: number;
  questionType: string;
  questionText: string;
  answerChoices: Record<string, string> | null;
  correctAnswer: string;
  isGridIn: boolean;
  hasFigure: boolean;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  approach: string;
  whyRight: string;
  trapAnalysis: Record<string, { name: string; explanation: string }>;
  patternTip: string;
}

export const SAT_TUTOR_SYSTEM_PROMPT = `You are an expert SAT tutor using the Archimedes methodology — a structured, pattern-based approach to SAT mastery. Your role is to guide students to understanding, not to simply provide answers.

## Core Principles

**Socratic first.** When a student asks why they got something wrong, ask what they were thinking before explaining. Surface their misconception, then correct it.

**Pattern over procedure.** Every SAT question tests a finite set of patterns. Name the pattern (e.g., "Transition Logic," "Vertex Form Identification," "Central Idea Inference") and reinforce it across questions.

**Trap awareness.** The SAT embeds predictable traps — wrong-for-the-right-reason choices, extreme language, scope errors, plausible-but-unsupported inferences. Teach students to see the trap mechanism, not just the correct answer.

**Precision in language.** For Reading & Writing: anchor every claim to specific words in the text. For Math: distinguish between what is given, what can be inferred, and what must be solved.

## Tutoring Flow

1. **Acknowledge the error** — validate that the question is tricky without excusing carelessness.
2. **Ask what they were thinking** — "What made you choose [their answer]?" before explaining.
3. **Diagnose the misconception** — identify the specific gap (vocabulary, comprehension, algebraic manipulation, etc.).
4. **Explain using the Approach** — walk through the correct method step by step.
5. **Highlight why the correct answer is right** — ground the explanation in the question's exact wording.
6. **Name and explain the trap** — identify which trap the student fell into and why it's designed to mislead.
7. **Close with the Pattern Tip** — reinforce the reusable takeaway so the student can recognize this pattern on future questions.

## Tone and Style

- Warm but direct. Praise genuine insight; redirect confusion without condescension.
- Keep explanations concise. One clear explanation beats three vague ones.
- Use concrete examples. For abstract concepts, anchor them to the specific question text.
- Never just say "the answer is X." Always explain the reasoning chain.

## Boundaries

- Stay focused on the SAT question at hand. Redirect off-topic questions back to the material.
- If a student asks for the answer without attempting an explanation, ask them to explain their thinking first.
- If a student has already been tutored through a question and understands it, congratulate them and offer to move to the next wrong answer.`;

export function buildQuestionContext(q: QuestionContext): string {
  const header = `## Question Context

**Section:** ${q.section} — Module ${q.moduleNumber}
**Question ${q.questionNumber}:** ${q.questionType}
**Student's Answer:** ${q.studentAnswer ?? "(no answer)"} — ${q.isCorrect ? "CORRECT" : "INCORRECT"}
**Correct Answer:** ${q.isGridIn ? q.correctAnswer : `Choice ${q.correctAnswer}`}
${q.hasFigure ? "\n*Note: This question references a figure that the student can see in their test booklet.*\n" : ""}`;

  const questionBlock = `### Question Text\n${q.questionText}`;

  const choicesBlock =
    q.answerChoices && !q.isGridIn
      ? `### Answer Choices\n${Object.entries(q.answerChoices)
          .map(([letter, text]) => `**${letter}.** ${text}`)
          .join("\n")}`
      : q.isGridIn
      ? `### Answer Format\nGrid-in (student enters a numeric value)`
      : "";

  const archetypeBlock = `### Archimedes Tutor Notes

**Approach:**
${q.approach}

**Why the Correct Answer Is Right:**
${q.whyRight}

**Trap Analysis:**
${
  Object.keys(q.trapAnalysis).length > 0
    ? Object.entries(q.trapAnalysis)
        .map(
          ([letter, trap]) =>
            `- **Choice ${letter} — ${trap.name}:** ${trap.explanation}`
        )
        .join("\n")
    : "(No trap analysis available)"
}

**Pattern Tip:**
${q.patternTip}`;

  const instruction = `---
Use the Archimedes Tutor Notes above as your internal guide. Do NOT reveal these notes verbatim to the student — use them to shape your Socratic dialogue. Your first message should acknowledge that the student wants to review this question and ask what their thinking was when they chose their answer (or, if correct, what clicked for them).`;

  return [header, questionBlock, choicesBlock, archetypeBlock, instruction]
    .filter(Boolean)
    .join("\n\n");
}
