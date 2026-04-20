import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import prisma from "../src/lib/prisma";

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(__dirname, "..", relativePath), "utf-8"));
}

interface ModuleQuestion {
  questionNumber: number;
  questionType: string;
  questionText: string;
  answerChoices: string | null;
  correctAnswer: string;
  isGridIn: boolean;
  hasFigure: boolean;
  approach: string;
  whyRight: string;
  trapAnalysis: string;
  patternTip: string;
}

interface ModuleData {
  section: string;
  moduleNumber: number;
  questions: ModuleQuestion[];
}

async function main() {
  const testData = readJson("content/tests/sat-test-4/test.json");

  const modules: { file: string; questionCount: number }[] = [
    { file: "content/tests/sat-test-4/rw-module-1.json", questionCount: 33 },
    { file: "content/tests/sat-test-4/rw-module-2.json", questionCount: 33 },
    { file: "content/tests/sat-test-4/math-module-1.json", questionCount: 27 },
    { file: "content/tests/sat-test-4/math-module-2.json", questionCount: 27 },
  ];

  console.log(`Seeding test: ${testData.name}`);

  const test = await prisma.test.upsert({
    where: { slug: testData.slug },
    update: {
      testType: testData.testType,
      name: testData.name,
      pdfUrl: testData.pdfUrl,
      answerPdfUrl: testData.answerPdfUrl,
      scoringPdfUrl: testData.scoringPdfUrl,
    },
    create: {
      testType: testData.testType,
      name: testData.name,
      slug: testData.slug,
      pdfUrl: testData.pdfUrl,
      answerPdfUrl: testData.answerPdfUrl,
      scoringPdfUrl: testData.scoringPdfUrl,
    },
  });

  console.log(`  Test id: ${test.id}`);

  for (const { file, questionCount } of modules) {
    const moduleData: ModuleData = readJson(file);
    const section = moduleData.section;
    const moduleNumber = moduleData.moduleNumber;

    console.log(`  Seeding ${section} Module ${moduleNumber} (${moduleData.questions.length} questions)`);

    const testModule = await prisma.testModule.upsert({
      where: {
        testId_section_moduleNumber: {
          testId: test.id,
          section,
          moduleNumber,
        },
      },
      update: { questionCount },
      create: {
        testId: test.id,
        section,
        moduleNumber,
        questionCount,
      },
    });

    for (const q of moduleData.questions) {
      await prisma.question.upsert({
        where: {
          moduleId_questionNumber: {
            moduleId: testModule.id,
            questionNumber: q.questionNumber,
          },
        },
        update: {
          questionType: q.questionType,
          questionText: q.questionText,
          answerChoices: q.answerChoices,
          correctAnswer: q.correctAnswer,
          isGridIn: q.isGridIn,
          hasFigure: q.hasFigure,
          approach: q.approach,
          whyRight: q.whyRight,
          trapAnalysis: q.trapAnalysis,
          patternTip: q.patternTip,
        },
        create: {
          moduleId: testModule.id,
          questionNumber: q.questionNumber,
          questionType: q.questionType,
          questionText: q.questionText,
          answerChoices: q.answerChoices,
          correctAnswer: q.correctAnswer,
          isGridIn: q.isGridIn,
          hasFigure: q.hasFigure,
          approach: q.approach,
          whyRight: q.whyRight,
          trapAnalysis: q.trapAnalysis,
          patternTip: q.patternTip,
        },
      });
    }

    console.log(`    ✓ ${moduleData.questions.length} questions seeded`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
