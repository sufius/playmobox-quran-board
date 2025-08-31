"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

/* ===== Types ===== */
interface VerseProps {
  verse_number?: number;
  index: number;
  arabic: string;
  transcription: string;
  translation: string;
  color?: string;
}
interface SurahProps {
  chapter_name_arabic: string;
  chapter_name_transcribed: string;
  chapter_name_translated: Record<string, { language_name: string; name: string }>;
  chapter_number: number;
  number_of_ayahs: number;
}
interface BoardProps {
  params: Promise<{ surah: number; lang: string }>;
}

/* ===== Helpers ===== */
const convertToArabicNumerals = (n: number | string) =>
  n.toString().replace(/\d/g, (d: string) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)]);

type LanguagesProps = { [k: number]: string };
const languages: LanguagesProps = { 27: "de", 19: "en", 45: "ru" };
const languagesFlipped: Record<string, number> = Object.fromEntries(
  Object.entries(languages).map(([k, v]) => [v, Number(k)])
);

const ROWS_PER_BOARD = 11;

function buildVerseSegments(rows: VerseProps[]) {
  const map = new Map<number, number[]>();
  rows.forEach((v, pos) => {
    const vn = v.verse_number ?? 0;
    if (!map.has(vn)) map.set(vn, []);
    map.get(vn)!.push(pos);
  });
  return map;
}
function computeAyahRangeParts(rows: VerseProps[], startIndex: number, endIndex: number, totalAyahs: number) {
  if (rows.length === 0 || startIndex >= rows.length) return { startLabel: "0", endLabel: "0", totalAyahs };
  const verseSegs = buildVerseSegments(rows);
  const startPos = startIndex;
  const endPos = Math.min(endIndex - 1, rows.length - 1);
  const startVN = rows[startPos].verse_number ?? rows[startPos].index;
  const endVN = rows[endPos].verse_number ?? rows[endPos].index;
  const startList = verseSegs.get(rows[startPos].verse_number ?? 0) ?? [startPos];
  const endList = verseSegs.get(rows[endPos].verse_number ?? 0) ?? [endPos];
  const startPart = startList.indexOf(startPos) + 1;
  const endPart = endList.indexOf(endPos) + 1;
  const startLabel = startPart > 1 ? `${startVN}.${startPart}` : String(startVN);
  const endLabel = endPart < endList.length ? `${endVN}.${endPart}` : String(endVN);
  return { startLabel, endLabel, totalAyahs };
}

/* ===== UI bits ===== */
function AyahRangeNav(props: {
  startLabel: string;
  endLabel: string;
  totalAyahs: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { startLabel, endLabel, totalAyahs, canPrev, canNext, onPrev, onNext } = props;
  return (
    <>
      {"ʾāyāt: "}
      <span
        className={canPrev ? styles.ayahHit : styles.ayahHitDisabled}
        style={{ display: "inline-block", textAlign: "center", userSelect: "none" as const }}
        role={canPrev ? "button" : undefined}
        tabIndex={canPrev ? 0 : -1}
        onClick={canPrev ? onPrev : undefined}
        onKeyDown={canPrev ? (e) => (e.key === "Enter" || e.key === " ") && onPrev?.() : undefined}
      >
        {startLabel}
      </span>
      {" – "}
      <span
        className={canNext ? styles.ayahHit : styles.ayahHitDisabled}
        style={{ display: "inline-block", textAlign: "center", userSelect: "none" as const }}
        role={canNext ? "button" : undefined}
        tabIndex={canNext ? 0 : -1}
        onClick={canNext ? onNext : undefined}
        onKeyDown={canNext ? (e) => (e.key === "Enter" || e.key === " ") && onNext?.() : undefined}
      >
        {endLabel}
      </span>
      <span style={{ verticalAlign: "top", lineHeight: "1.1rem" }}>{` [${totalAyahs}]`}</span>
    </>
  );
}

/* ===== Data loaders ===== */
async function fetchSurahMeta(surah: number): Promise<SurahProps> {
  const res = await fetch(`/surat/complete/surah-${surah}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load surah meta for ${surah}`);
  return res.json();
}
async function fetchVerses(surah: number, lang: string): Promise<VerseProps[]> {
  const langKey = languagesFlipped[lang];
  if (langKey === undefined) throw new Error(`Unknown language "${lang}". Add it to the languages map.`);
  const url = `/surat/segmented/${lang}/${langKey}/surah-${surah}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load verses from ${url}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Verses JSON must be an array at ${url}`);
  return data;
}

/* ===== Verse row ===== */
const Verse = ({ displayIndex, verse }: { displayIndex: number; verse: VerseProps }) => {
  const { verse_number, arabic, transcription, translation, color } = verse;
  return (
    <>
      <div className={`d-none position-absolute btn-close translate-middle ${styles["button-" + displayIndex]}`}></div>

      <span
        style={{ whiteSpace: "nowrap" }}
        className={`position-absolute translate-middle-y text-transcribed ${styles["button-" + displayIndex + "-transcribed"]} raleway-500`}
        dangerouslySetInnerHTML={{
          __html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${transcription}` : transcription,
        }}
      />
      <span
        className={`position-absolute translate-middle-y text-translated ${styles["button-" + displayIndex + "-translated"]} raleway-500`}
        dangerouslySetInnerHTML={{
          __html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${translation}` : translation,
        }}
      />
      <span
        style={{ whiteSpace: "nowrap", color }}
        className={`position-absolute translate-middle-y arabic-font-400 text-arabic ${styles["button-" + displayIndex + "-arabic"]}`}
        dangerouslySetInnerHTML={{
          __html: verse_number ? `&#xFD3F;${convertToArabicNumerals(verse_number)}&#xFD3E; ${arabic}` : arabic,
        }}
      />
      <hr className={`position-absolute ${styles["button-" + displayIndex + "-divider"]}`} />
    </>
  );
};

/* ===== Page component ===== */
export default function Board({ params }: BoardProps) {
  // 1) FIRST HOOK: unwrap params (must be first to keep hook order stable)
  const raw = use(params);
  const surahNum = Number(raw.surah) || 1;   // ← sicher numeric
  const lang = raw.lang || "de";

  // 2) State hooks
  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<VerseProps[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 3) Router/Search (context hooks)
  const router = useRouter();
  const searchParams = useSearchParams();
  let boardParam = Number(searchParams.get("board"));
  if (!boardParam || boardParam < 1) {
    // Prüfen, ob im localStorage ein Wert existiert
    const saved = typeof window !== "undefined" ? localStorage.getItem(`board-surah-${surah}`) : null;
    if (saved) {
      boardParam = Number(saved);
    }
  }
  const board = Math.max(1, boardParam || 1);
  const totalRows = rows?.length ?? 0;
  const totalBoards = Math.max(1, Math.ceil(totalRows / ROWS_PER_BOARD));
  const currentBoard = Math.min(board, totalBoards);
  const startIndex = (currentBoard - 1) * ROWS_PER_BOARD;
  const endIndex = Math.min(startIndex + ROWS_PER_BOARD, totalRows);

  // 5) Navigation callbacks (ALWAYS defined before any return)
  const goToBoard = useCallback(
    (nextBoard: number) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("board", String(nextBoard));
      router.push(`?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );
  const canPrev = currentBoard > 1;
  const canNext = currentBoard < totalBoards;
  const goPrev = useCallback(() => { if (canPrev) goToBoard(currentBoard - 1); }, [canPrev, currentBoard, goToBoard]);
  const goNext = useCallback(() => { if (canNext) goToBoard(currentBoard + 1); }, [canNext, currentBoard, goToBoard]);

// speichern
useEffect(() => {
  if (rows) localStorage.setItem(`board-surah-${surahNum}`, String(currentBoard));
}, [surahNum, currentBoard, rows]);


// 6) Keyboard navigation effect (ALWAYS registered)
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (surahNum > 1) {
        const saved = localStorage.getItem(`board-surah-${surahNum - 1}`);
        const nextBoard = saved ? Number(saved) : 1;
        router.push(`/surah/${surahNum - 1}/lang/${lang}?board=${nextBoard}`, { scroll: false });
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (surahNum < 114) {
        const saved = localStorage.getItem(`board-surah-${surahNum + 1}`);
        const nextBoard = saved ? Number(saved) : 1;
        router.push(`/surah/${surahNum + 1}/lang/${lang}?board=${nextBoard}`, { scroll: false });
      }
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [goPrev, goNext, surahNum, lang, router]);

  // 7) Data load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [meta, verses] = await Promise.all([
          fetchSurahMeta(surahNum),         // ← hier
          fetchVerses(surahNum, lang),      // ← und hier
        ]);
        if (!alive) return;
        setData(meta);
        setRows(verses);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "File not found or an error occurred");
      }
    })();
    return () => { alive = false; };
  }, [surahNum, lang]);                      // ← Dependency auch numeric

  useEffect(() => {
    document.title = `quran_${lang}_surah_${surahNum}_board_${currentBoard}`;
  }, [ lang, surahNum, currentBoard]);

  // 8) Early returns (AFTER all hooks)
  if (error) return <div className="p-3 text-danger">{error}</div>;
  if (!data || !rows) return <>...Loading</>;

  // 9) Now that we have rows, compute labels and page slice
  const pageRows = rows.slice(startIndex, endIndex);
  const { startLabel, endLabel } = computeAyahRangeParts(rows, startIndex, endIndex, data.number_of_ayahs);

  return (
    <div className={styles["page"]}>
      <h6 className="position-absolute pmb-text-primary surah-number">
        <b>s&#363;rah: {data.chapter_number}</b>
      </h6>

      <h6 className="position-absolute pmb-text-primary ayat-numbers">
        <b>
          <AyahRangeNav
            startLabel={startLabel}
            endLabel={endLabel}
            totalAyahs={data.number_of_ayahs}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={goPrev}
            onNext={goNext}
          />
        </b>
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

      <img className="position-absolute bismillah-image" src="/bismillah.svg" alt="Bismillāhir-raḥmānir-raḥīm(i)" width="150" />
      <h6 className="position-absolute bismillah-image-transcribed text-transcribed">Bismillāhir-raḥmānir-raḥīm(i)</h6>

      <span className="d-none position-absolute pmb-module-footprint border border-1 bg-gradient"></span>
      <span className="d-none position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span>

      {pageRows.map((verse, i) => (
        <Verse key={`${verse.index}-${startIndex + i}`} displayIndex={i + 1} verse={verse} />
      ))}
    </div>
  );
}
