import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type EditPayload = {
  langKey: string | number;
  chapterNumber: number;
  verseNumber: number;
  verseIndex: number;
  field: "translation" | "transcription";
  start: number;
  end: number;
  action: "delete" | "cut_prepend_next" | "cut_append_prev";
};

type VerseRow = {
  index: number;
  verse_number?: number;
  translation: string;
  transcription: string;
  [key: string]: unknown;
};

function isInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

function joinWithSpace(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  if (!left.endsWith(" ") && !right.startsWith(" ")) {
    return `${left} ${right}`;
  }
  return `${left}${right}`;
}

function prependWithSpace(prefix: string, text: string) {
  if (!prefix) return text;
  if (!text) return prefix;
  if (!prefix.endsWith(" ") && !text.startsWith(" ")) {
    return `${prefix} ${text}`;
  }
  return `${prefix}${text}`;
}

function appendWithSpace(text: string, suffix: string) {
  if (!text) return suffix;
  if (!suffix) return text;
  if (!text.endsWith(" ") && !suffix.startsWith(" ")) {
    return `${text} ${suffix}`;
  }
  return `${text}${suffix}`;
}

export async function POST(request: Request) {
  let payload: EditPayload | null = null;
  try {
    payload = (await request.json()) as EditPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (
    !payload ||
    (typeof payload.langKey !== "string" && typeof payload.langKey !== "number") ||
    !isInteger(payload.chapterNumber) ||
    !isInteger(payload.verseNumber) ||
    !isInteger(payload.verseIndex) ||
    (payload.field !== "translation" && payload.field !== "transcription") ||
    !isInteger(payload.start) ||
    !isInteger(payload.end) ||
    (payload.action !== "delete" &&
      payload.action !== "cut_prepend_next" &&
      payload.action !== "cut_append_prev")
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const langKey = String(payload.langKey);
  const filePath = path.join(
    process.cwd(),
    "public",
    "surat",
    "segmented",
    "de",
    langKey,
    `surah-${payload.chapterNumber}.json`
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

  const rowIndex = rows.findIndex((row) => row.index === payload!.verseIndex);
  if (rowIndex === -1) {
    return NextResponse.json({ error: "Verse not found." }, { status: 404 });
  }

  const row = rows[rowIndex];
  if ((row.verse_number ?? row.index) !== payload.verseNumber) {
    return NextResponse.json({ error: "Verse number mismatch." }, { status: 400 });
  }

  const fieldValue = row[payload.field];
  if (typeof fieldValue !== "string") {
    return NextResponse.json({ error: "Field is not editable." }, { status: 400 });
  }

  if (payload.start < 0 || payload.end > fieldValue.length || payload.start >= payload.end) {
    return NextResponse.json({ error: "Invalid selection range." }, { status: 400 });
  }

  const selection = fieldValue.slice(payload.start, payload.end);
  const left = fieldValue.slice(0, payload.start);
  const right = fieldValue.slice(payload.end);

  if (payload.action === "delete") {
    row[payload.field] = joinWithSpace(left, right);
  } else if (payload.action === "cut_prepend_next") {
    if (rowIndex + 1 >= rows.length) {
      return NextResponse.json({ error: "No next segment to receive text." }, { status: 400 });
    }
    row[payload.field] = joinWithSpace(left, right);
    const next = rows[rowIndex + 1];
    const nextValue = typeof next[payload.field] === "string" ? next[payload.field] : "";
    next[payload.field] = prependWithSpace(selection, nextValue);
  } else if (payload.action === "cut_append_prev") {
    if (rowIndex - 1 < 0) {
      return NextResponse.json({ error: "No previous segment to receive text." }, { status: 400 });
    }
    row[payload.field] = joinWithSpace(left, right);
    const prev = rows[rowIndex - 1];
    const prevValue = typeof prev[payload.field] === "string" ? prev[payload.field] : "";
    prev[payload.field] = appendWithSpace(prevValue, selection);
  }

  await fs.writeFile(filePath, JSON.stringify(rows, null, 2) + "\n", "utf8");

  return NextResponse.json({ ok: true });
}
