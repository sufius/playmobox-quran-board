import { readFile } from "node:fs/promises";
import path from "node:path";
import LandingPage, { type SurahListItem } from "./landing-page";

const ROWS_PER_BOARD = 11;

// Keeping language and translation separate makes it possible to add several
// translations for the same language without changing the list component.
const selectedTranslation = {
  language: "de",
  languageId: 27,
  languageLabel: "Deutsch",
  translationLabel: "Übersetzung 27",
};

export const dynamic = "force-dynamic";

type SurahMetadata = {
  chapter_name_arabic: string;
  chapter_name_transcribed: string;
  chapter_name_translated: Record<string, { name: string }>;
};

async function loadSurah(number: number): Promise<SurahListItem> {
  const publicDirectory = path.join(process.cwd(), "public", "surat");
  const metadataPath = path.join(publicDirectory, "complete", `surah-${number}.json`);
  const segmentsPath = path.join(
    publicDirectory,
    "segmented",
    selectedTranslation.language,
    String(selectedTranslation.languageId),
    `surah-${number}.json`,
  );

  const [metadataJson, segmentsJson] = await Promise.all([
    readFile(metadataPath, "utf8"),
    readFile(segmentsPath, "utf8"),
  ]);
  const metadata = JSON.parse(metadataJson) as SurahMetadata;
  const segments = JSON.parse(segmentsJson) as unknown;

  if (!Array.isArray(segments)) {
    throw new Error(`${segmentsPath} enthält keine Segmentliste.`);
  }

  return {
    number,
    transcribedName: metadata.chapter_name_transcribed,
    translatedName:
      metadata.chapter_name_translated[selectedTranslation.language]?.name ??
      metadata.chapter_name_transcribed,
    arabicName: metadata.chapter_name_arabic,
    boardCount: Math.max(1, Math.ceil(segments.length / ROWS_PER_BOARD)),
  };
}

export default async function Home() {
  const surahs = await Promise.all(
    Array.from({ length: 114 }, (_, index) => loadSurah(index + 1)),
  );

  return <LandingPage surahs={surahs} translation={selectedTranslation} />;
}
