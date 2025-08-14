"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

/* =========================
   Types
   ========================= */
interface VerseProps {
  verse_number?: number;
  index: number;
  arabic: string;
  transcription: string;
  translation: string;
}

interface SurahProps {
  chapter_name_arabic: string;
  chapter_name_transcribed: string;
  chapter_name_translated: {
    [key: string]: {
      language_name: string;
      name: string;
    };
  };
  chapter_number: number;
  number_of_ayahs: number;
}

/* =========================
   Helpers / constants
   ========================= */
const convertToArabicNumerals = (latinNumber: number | string) =>
  latinNumber.toString().replace(/\d/g, (digit: string) => "٠١٢٣٤٥٦٧٨٩"[parseInt(digit, 10)]);

type LanguagesProps = { [key: number]: string };
type LanguagesFlippedProps = { [key: string]: number };
const flip = (obj: LanguagesProps): LanguagesFlippedProps =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, Number(k)]));

// Map of languageKey -> langCode
const languages: LanguagesProps = {
  27: "de",
  19: "en",
  45: "ru",
};
const languagesFlipped: LanguagesFlippedProps = flip(languages);

const ROWS_PER_BOARD = 11;

/** Build a map of verse_number -> array of row positions (indices) */
function buildVerseSegments(rows: VerseProps[]) {
  const map = new Map<number, number[]>();
  rows.forEach((v, pos) => {
    const vn = v.verse_number ?? 0;
    if (!map.has(vn)) map.set(vn, []);
    map.get(vn)!.push(pos);
  });
  return map;
}

/** Format ayah range with “parts” when board starts/ends mid-verse */
function formatAyahRange(rows: VerseProps[], startIndex: number, endIndex: number, totalAyahs: number) {
  if (rows.length === 0 || startIndex >= rows.length) return `ʾāyāt: 0–0 [${totalAyahs}]`;

  const verseSegs = buildVerseSegments(rows);

  const startPos = startIndex;
  const endPos = Math.min(endIndex - 1, rows.length - 1);

  const startVN = rows[startPos].verse_number ?? rows[startPos].index;
  const endVN = rows[endPos].verse_number ?? rows[endPos].index;

  const startList = verseSegs.get(rows[startPos].verse_number ?? 0) ?? [startPos];
  const endList = verseSegs.get(rows[endPos].verse_number ?? 0) ?? [endPos];

  const startPart = startList.indexOf(startPos) + 1; // 1-based
  const endPart = endList.indexOf(endPos) + 1;       // 1-based

  const startIsPartial = startPart > 1;
  const endIsPartial = endPart < endList.length;

  const startLabel = startIsPartial ? `${startVN}.${startPart}` : String(startVN);
  const endLabel = endIsPartial ? `${endVN}.${endPart}` : String(endVN);

  return `ʾāyāt: ${startLabel}–${endLabel} [${totalAyahs}]`;
}

/* =========================
   Data loaders (public/)
   ========================= */
async function fetchSurahMeta(surah: number): Promise<SurahProps> {
  const res = await fetch(`/surat/complete/surah-${surah}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load surah meta for ${surah}`);
  return (await res.json()) as SurahProps;
}

async function fetchVerses(surah: number, lang: string): Promise<VerseProps[]> {
  const langKey = languagesFlipped[lang];
  if (langKey === undefined) {
    throw new Error(`Unknown language "${lang}". Add it to the languages map.`);
  }
  const url = `/surat/segmented/${lang}/${langKey}/surah-${surah}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load verses from ${url}`);
  const data = (await res.json()) as VerseProps[];
  if (!Array.isArray(data)) throw new Error(`Verses JSON must be an array at ${url}`);
  return data;
}

/* =========================
   Verse item
   ========================= */
const Verse = ({
  displayIndex,
  verse,
}: {
  displayIndex: number; // 1..11 per board for CSS positioning
  verse: VerseProps;
}) => {
  const { verse_number, arabic, transcription, translation } = verse;

  return (
    <>
      <div className={`d-none position-absolute btn-close translate-middle ${styles["button-" + displayIndex]}`}></div>

      <span
        style={{ whiteSpace: "nowrap" }}
        className={`position-absolute translate-middle-y text-transcribed ${styles["button-" + displayIndex + "-transcribed"]}`}
        dangerouslySetInnerHTML={{
          __html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${transcription}` : transcription,
        }}
      />

      <span
        className={`position-absolute translate-middle-y text-translated ${styles["button-" + displayIndex + "-translated"]}`}
        dangerouslySetInnerHTML={{
          __html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${translation}` : translation,
        }}
      />

      <span
        style={{ whiteSpace: "nowrap" }}
        className={`position-absolute translate-middle-y arabic-font-400 text-arabic ${styles["button-" + displayIndex + "-arabic"]}`}
        dangerouslySetInnerHTML={{
          __html: verse_number
            ? `&#xFD3F;${convertToArabicNumerals(verse_number)}&#xFD3E; ${arabic}`
            : arabic,
        }}
      />

      <hr className={`position-absolute ${styles["button-" + displayIndex + "-divider"]}`} />
    </>
  );
};

/* =========================
   Page component
   ========================= */
interface BoardProps {
  params: Promise<{
    surah: number;
    lang: string;
  }>;
}

export default function Board({ params }: BoardProps) {
  const { surah = 1, lang = "de" } = use(params);

  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<VerseProps[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const board = Math.max(1, Number(searchParams.get("board")) || 1); // 1-based
  const totalRows = rows?.length ?? 0;

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [meta, verses] = await Promise.all([fetchSurahMeta(surah), fetchVerses(surah, lang)]);
        if (!alive) return;
        setData(meta);
        setRows(verses);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setError(e?.message ?? "File not found or an error occurred");
      }
    })();

    return () => {
      alive = false;
    };
  }, [surah, lang]);

  if (error) return <div className="p-3 text-danger">{error}</div>;
  if (!data || !rows) return <>...Loading</>;

  // Board slice (fixed 11 rows/page; last board may be shorter)
  const totalBoards = Math.max(1, Math.ceil(totalRows / ROWS_PER_BOARD));
  const currentBoard = Math.min(board, totalBoards);
  const startIndex = (currentBoard - 1) * ROWS_PER_BOARD;
  const endIndex = Math.min(startIndex + ROWS_PER_BOARD, totalRows);
  const pageRows = rows.slice(startIndex, endIndex);

  const ayahRange = formatAyahRange(rows, startIndex, endIndex, data.number_of_ayahs);

  return (
    <div className={styles["page"]}>
      <h6 className="position-absolute pmb-text-primary surah-number">
        <b>s&#363;rah: {data.chapter_number}</b>
      </h6>

      <h6 className="position-absolute pmb-text-primary ayat-numbers">
        <b>{ayahRange}</b>
      </h6>

      <h6 className="position-absolute surah-name-transcribed text-transcribed">
        {data.chapter_name_transcribed}
      </h6>

      <h6 className="position-absolute text-translated surah-name-translated text-transcribed">
        {data.chapter_name_translated[lang]?.name ?? data.chapter_name_transcribed}
      </h6>

      <h6 className="position-absolute surah-name-arabic arabic-font-400 text-arabic">
        {data.chapter_name_arabic}
      </h6>

      <img
        className="position-absolute bismillah-image"
        src="/bismillah.svg"
        alt="Bismillāhir-raḥmānir-raḥīm(i)"
        width="150"
      />
      <h6 className="position-absolute bismillah-image-transcribed text-transcribed">
        Bismillāhir-raḥmānir-raḥīm(i)
      </h6>

      <span className="d-none position-absolute pmb-module-footprint border border-1 bg-gradient"></span>
      <span className="d-none position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span>

      {pageRows.map((verse, i) => (
        <Verse
          key={`${verse.index}-${startIndex + i}`}
          displayIndex={i + 1} // 1..11 per board for CSS positions
          verse={verse}
        />
      ))}
    </div>
  );
}
