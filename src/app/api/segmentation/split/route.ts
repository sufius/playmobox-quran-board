import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type SplitPayload = {
  langKey: string | number;
  chapterNumber: number;
  verseNumber: number;
  verseIndex: number;
  spaceIndex: number;
};

type VerseRow = {
  index: number;
  verse_number?: number;
  translation: string;
  arabic_full?: string;
  arabic: string;
  transcription: string;
  [key: string]: unknown;
};

type OpenAISplit = {
  arabicA: string;
  arabicB: string;
  transcriptionA: string;
  transcriptionB: string;
};

const OPENAI_SPLIT_PROMPT = `Split the Arabic and transcription strings into two parts aligned with the provided translation split.

Constraints:
- Use only the provided strings.
- Preserve all characters exactly.
- Do not trim or normalize.
- Output must be JSON only with keys: arabicA, arabicB, transcriptionA, transcriptionB.
- The parts must concatenate back to the original strings.

Input:
Arabic: """{{ARABIC}}"""
Transcription: """{{TRANSCRIPTION}}"""
TranslationA: """{{TRANSLATION_A}}"""
TranslationB: """{{TRANSLATION_B}}"""`;

function buildPrompt(arabic: string, transcription: string, translationA: string, translationB: string) {
  return OPENAI_SPLIT_PROMPT.replace("{{ARABIC}}", arabic)
    .replace("{{TRANSCRIPTION}}", transcription)
    .replace("{{TRANSLATION_A}}", translationA)
    .replace("{{TRANSLATION_B}}", translationB);
}

function isInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

function findNthSpaceIndex(text: string, target: number): number {
  if (target < 0) return -1;
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === " ") {
      if (count === target) return i;
      count += 1;
    }
  }
  return -1;
}

async function callOpenAI(apiKey: string, prompt: string): Promise<OpenAISplit> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You must respond with JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${detail}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response missing content.");
  }

  let parsed: OpenAISplit;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("OpenAI JSON parse failed. Raw content:", content);
    throw new Error("OpenAI response was not valid JSON.");
  }

  return parsed;
}

function validateSplit(result: OpenAISplit, arabic: string, transcription: string) {
  if (
    !result ||
    typeof result.arabicA !== "string" ||
    typeof result.arabicB !== "string" ||
    typeof result.transcriptionA !== "string" ||
    typeof result.transcriptionB !== "string"
  ) {
    return false;
  }
  return result.arabicA + result.arabicB === arabic && result.transcriptionA + result.transcriptionB === transcription;
}

async function splitArabicAndTranscription(
  arabic: string,
  transcription: string,
  translationA: string,
  translationB: string
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const prompt = buildPrompt(arabic, transcription, translationA, translationB);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await callOpenAI(apiKey, prompt);
      if (validateSplit(result, arabic, transcription)) {
        return result;
      }
      console.error("OpenAI split validation failed. Raw result:", result);
      lastError = new Error("OpenAI response failed concatenation validation.");
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error("Failed to split arabic/transcription.");
}

export async function POST(request: Request) {
  let payload: SplitPayload | null = null;
  try {
    payload = (await request.json()) as SplitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (
    !payload ||
    (typeof payload.langKey !== "string" && typeof payload.langKey !== "number") ||
    !isInteger(payload.chapterNumber) ||
    !isInteger(payload.verseNumber) ||
    !isInteger(payload.verseIndex) ||
    !isInteger(payload.spaceIndex)
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const langKey = String(payload.langKey);
  const chapterNumber = payload.chapterNumber;
  const verseNumber = payload.verseNumber;
  const verseIndex = payload.verseIndex;
  const spaceIndex = payload.spaceIndex;

  const filePath = path.join(
    process.cwd(),
    "public",
    "surat",
    "segmented",
    "de",
    langKey,
    `surah-${chapterNumber}.json`
  );

  let rows: VerseRow[];
  try {
    const raw = await fs.readFile(filePath, "utf8");
    rows = JSON.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "Segment file not found." }, { status: 404 });
  }

  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Segment file is invalid." }, { status: 500 });
  }

  const rowIndex = rows.findIndex((row) => row.index === verseIndex);
  if (rowIndex === -1) {
    return NextResponse.json({ error: "Verse not found." }, { status: 404 });
  }

  const row = rows[rowIndex];
  if ((row.verse_number ?? row.index) !== verseNumber) {
    return NextResponse.json({ error: "Verse number mismatch." }, { status: 400 });
  }

  const spacePos = findNthSpaceIndex(row.translation, spaceIndex);
  if (spacePos === -1) {
    return NextResponse.json({ error: "spaceIndex out of range." }, { status: 400 });
  }

  const translationA = row.translation.slice(0, spacePos);
  const translationB = row.translation.slice(spacePos + 1);

  let split: OpenAISplit;
  try {
    split = await splitArabicAndTranscription(row.arabic, row.transcription, translationA, translationB);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "OpenAI split failed." }, { status: 500 });
  }

  row.translation = translationA;
  row.arabic = split.arabicA;
  row.transcription = split.transcriptionA;

  const newRow: VerseRow = {
    ...row,
    index: verseIndex + 1,
    verse_number: row.verse_number,
    translation: translationB,
    arabic_full: row.arabic_full,
    arabic: split.arabicB,
    transcription: split.transcriptionB,
  };

  rows.splice(rowIndex + 1, 0, newRow);
  for (let i = rowIndex + 2; i < rows.length; i += 1) {
    rows[i].index += 1;
  }

  await fs.writeFile(filePath, JSON.stringify(rows, null, 2) + "\n", "utf8");

  return NextResponse.json({ ok: true, insertedIndex: verseIndex + 1 });
}
