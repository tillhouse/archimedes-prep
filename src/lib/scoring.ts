import { readFileSync } from "fs";
import { join } from "path";

interface ScoreEntry {
  raw: number;
  lower: number;
  upper: number;
}

interface ScoringTable {
  readingWriting: ScoreEntry[];
  math: ScoreEntry[];
}

function loadScoringTable(testSlug: string): ScoringTable {
  const filePath = join(process.cwd(), "content", "tests", testSlug, "scoring.json");
  return JSON.parse(readFileSync(filePath, "utf-8")) as ScoringTable;
}

export interface ScoreRange {
  lower: number;
  upper: number;
}

export function normalizeGridIn(value: string): number | null {
  const trimmed = value.trim();
  const fractionMatch = trimmed.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    if (den === 0) return null;
    return num / den;
  }
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

export function isGridInCorrect(studentAnswer: string, correctAnswer: string): boolean {
  const studentNorm = normalizeGridIn(studentAnswer);
  if (studentNorm === null) return false;
  // Pipe-separated accepted answers (e.g., "15|-5")
  const accepted = correctAnswer.split("|").map((a) => normalizeGridIn(a.trim()));
  return accepted.some((a) => a !== null && Math.abs(studentNorm - a) < 0.0001);
}

export function isAnswerCorrect(
  studentAnswer: string,
  correctAnswer: string,
  isGridIn: boolean
): boolean {
  if (!studentAnswer || studentAnswer.trim() === "") return false;
  if (isGridIn) return isGridInCorrect(studentAnswer, correctAnswer);
  return studentAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
}

export function rawToScaled(
  section: "readingWriting" | "math",
  rawScore: number,
  table: ScoringTable
): ScoreRange {
  const entries = table[section];
  const entry = entries.find((e) => e.raw === rawScore);
  return entry ? { lower: entry.lower, upper: entry.upper } : { lower: 200, upper: 200 };
}

export function calculateScores(
  rwRaw: number,
  mathRaw: number,
  testSlug: string
): {
  rwRaw: number;
  mathRaw: number;
  rwScoreLower: number;
  rwScoreUpper: number;
  mathScoreLower: number;
  mathScoreUpper: number;
  totalLower: number;
  totalUpper: number;
} {
  const table = loadScoringTable(testSlug);
  const rw = rawToScaled("readingWriting", rwRaw, table);
  const math = rawToScaled("math", mathRaw, table);
  return {
    rwRaw,
    mathRaw,
    rwScoreLower: rw.lower,
    rwScoreUpper: rw.upper,
    mathScoreLower: math.lower,
    mathScoreUpper: math.upper,
    totalLower: rw.lower + math.lower,
    totalUpper: rw.upper + math.upper,
  };
}
