"use client";

import { use, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
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

type SelectionMenuState = {
  x: number;
  y: number;
  field: "translation" | "transcription";
  verseIndex: number;
  verseNumber: number;
  start: number;
  end: number;
  atStart: boolean;
  atEnd: boolean;
};

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
const Verse = ({
  chapterNumber,
  displayIndex,
  verse,
  langKey,
  isEdit,
}: {
  chapterNumber: number;
  displayIndex: number;
  verse: VerseProps;
  langKey: number;
  isEdit: boolean;
}) => {
  const { verse_number, arabic, transcription, translation, color } = verse;
  const router = useRouter();
  const [hoveredSpaceIndex, setHoveredSpaceIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const verseNumberForApi = verse_number ?? verse.index;
  const translationPrefix = verse_number ? `\ufd3e${verse_number}\ufd3f ` : "";
  const transcriptionPrefix = verse_number ? `\ufd3e${verse_number}\ufd3f ` : "";

  const handleSplitClick = useCallback(
    async (spaceIndex: number) => {
      if (!isEdit) return;
      if (pending) return;
      const confirmed = window.confirm("Do you really want to split it here?");
      if (!confirmed) return;
      setPending(true);
      try {
        const res = await fetch("/api/segmentation/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            langKey: String(langKey),
            chapterNumber,
            verseNumber: verseNumberForApi,
            verseIndex: verse.index,
            spaceIndex,
          }),
        });
        if (!res.ok) {
          const msg = await res.text();
          console.error("Split failed:", msg);
          window.alert(`Split failed: ${msg || res.statusText}`);
          return;
        }
        router.refresh();
      } catch (err) {
        console.error("Split failed:", err);
        window.alert("Split failed. Please try again.");
      } finally {
        setPending(false);
      }
    },
    [pending, isEdit, langKey, chapterNumber, verseNumberForApi, verse.index, router]
  );

  const translationNodes: ReactNode[] = [];
  let buffer = "";
  let spaceIndex = 0;
  let nodeKey = 0;
  for (const ch of translation) {
    if (ch === " ") {
      if (buffer) {
        translationNodes.push(buffer);
        buffer = "";
      }
      const currentSpaceIndex = spaceIndex;
      translationNodes.push(
        <span
          key={`space-${nodeKey++}`}
          className={[
            styles.translationSpace,
            hoveredSpaceIndex === currentSpaceIndex ? styles.translationSpaceHover : "",
            pending || !isEdit ? styles.translationSpaceDisabled : "",
          ].join(" ")}
          role={isEdit ? "button" : undefined}
          aria-disabled={pending || !isEdit}
          aria-label={`Split at space ${currentSpaceIndex + 1}`}
          onMouseEnter={isEdit ? () => setHoveredSpaceIndex(currentSpaceIndex) : undefined}
          onMouseLeave={
            isEdit ? () => setHoveredSpaceIndex((prev) => (prev === currentSpaceIndex ? null : prev)) : undefined
          }
          onClick={isEdit ? () => handleSplitClick(currentSpaceIndex) : undefined}
        >
          {" "}
        </span>
      );
      spaceIndex += 1;
    } else {
      buffer += ch;
    }
  }
  if (buffer) translationNodes.push(buffer);

  return (
    <>
      <div className={`d-none position-absolute btn-close translate-middle ${styles["button-" + displayIndex]}`}></div>

      <span
        style={{ whiteSpace: "nowrap" }}
        className={`position-absolute translate-middle-y text-transcribed ${styles["button-" + displayIndex + "-transcribed"]} raleway-500`}
        data-field="transcription"
        data-verse-index={verse.index}
        data-verse-number={verseNumberForApi}
        data-prefix-len={transcriptionPrefix.length}
      >
        {transcriptionPrefix ? <span style={{ userSelect: "none" }}>{transcriptionPrefix}</span> : null}
        {transcription}
      </span>
      <span
        className={`position-absolute translate-middle-y text-translated ${styles["button-" + displayIndex + "-translated"]} raleway-500`}
        data-field="translation"
        data-verse-index={verse.index}
        data-verse-number={verseNumberForApi}
        data-prefix-len={translationPrefix.length}
      >
        {translationPrefix ? <span style={{ userSelect: "none" }}>{translationPrefix}</span> : null}
        {translationNodes}
      </span>
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
  const langKey = languagesFlipped[lang]!;

  // 2) State hooks
  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<VerseProps[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);

  // 3) Router/Search (context hooks)
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "true";
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

  const applySelectionEdit = useCallback(
    async (action: "delete" | "cut_prepend_next" | "cut_append_prev") => {
      if (!selectionMenu) return;
      const menu = selectionMenu;
      setSelectionMenu(null);
      try {
        const res = await fetch("/api/segmentation/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            langKey: String(langKey),
            chapterNumber: surahNum,
            verseNumber: menu.verseNumber,
            verseIndex: menu.verseIndex,
            field: menu.field,
            start: menu.start,
            end: menu.end,
            action,
          }),
        });
        if (!res.ok) {
          const msg = await res.text();
          console.error("Selection edit failed:", msg);
          window.alert(`Selection edit failed: ${msg || res.statusText}`);
          return;
        }
        window.location.reload();
      } catch (err) {
        console.error("Selection edit failed:", err);
        window.alert("Selection edit failed. Please try again.");
      }
    },
    [selectionMenu, langKey, surahNum]
  );

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
        if (surahNum < 114) {
          const saved = localStorage.getItem(`board-surah-${surahNum + 1}`);
          const nextBoard = saved ? Number(saved) : 1;
          router.push(`/surah/${surahNum + 1}/lang/${lang}?board=${nextBoard}`, { scroll: false });
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (surahNum > 1) {
          const saved = localStorage.getItem(`board-surah-${surahNum - 1}`);
          const nextBoard = saved ? Number(saved) : 1;
          router.push(`/surah/${surahNum - 1}/lang/${lang}?board=${nextBoard}`, { scroll: false });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, surahNum, lang, router]);

  useEffect(() => {
    if (!isEdit) {
      setSelectionMenu(null);
      return;
    }
    const handlePointerUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionMenu(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const anchorNode = selection.anchorNode;
      if (!anchorNode) {
        setSelectionMenu(null);
        return;
      }
      const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
      const container = anchorElement?.closest<HTMLElement>("[data-field]");
      if (!container || !selection.focusNode || !container.contains(selection.focusNode)) {
        setSelectionMenu(null);
        return;
      }
      const fieldAttr = container.getAttribute("data-field");
      if (fieldAttr !== "translation" && fieldAttr !== "transcription") {
        setSelectionMenu(null);
        return;
      }
      if (!rows) {
        setSelectionMenu(null);
        return;
      }
      const verseIndex = Number(container.getAttribute("data-verse-index"));
      const verseNumber = Number(container.getAttribute("data-verse-number"));
      const prefixLen = Number(container.getAttribute("data-prefix-len") || "0");
      const row = rows.find((item) => item.index === verseIndex);
      if (!row) {
        setSelectionMenu(null);
        return;
      }
      const fieldText = fieldAttr === "translation" ? row.translation : row.transcription;
      const preRange = range.cloneRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.startContainer, range.startOffset);
      const rawStart = preRange.toString().length;
      const selectedText = range.toString();
      const rawEnd = rawStart + selectedText.length;
      if (selectedText.trim().length === 0) {
        setSelectionMenu(null);
        return;
      }
      if (rawStart < prefixLen || rawEnd < prefixLen) {
        setSelectionMenu(null);
        return;
      }
      let start = rawStart - prefixLen;
      let end = rawEnd - prefixLen;
      if (start < 0) start = 0;
      if (end > fieldText.length) end = fieldText.length;
      if (end <= start) {
        setSelectionMenu(null);
        return;
      }
      const before = fieldText.slice(0, start);
      const after = fieldText.slice(end);
      const atStart = before.trim().length === 0;
      const atEnd = after.trim().length === 0;
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionMenu(null);
        return;
      }
      setSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        field: fieldAttr,
        verseIndex,
        verseNumber,
        start,
        end,
        atStart,
        atEnd,
      });
    };
    document.addEventListener("pointerup", handlePointerUp);
    return () => document.removeEventListener("pointerup", handlePointerUp);
  }, [isEdit, rows]);

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
  }, [lang, surahNum, currentBoard]);

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
        <Verse
          chapterNumber={data.chapter_number}
          key={`${verse.index}-${startIndex + i}`}
          displayIndex={i + 1}
          verse={verse}
          langKey={langKey}
          isEdit={isEdit}
        />
      ))}
      {isEdit && selectionMenu ? (
        <div
          style={{
            position: "fixed",
            left: selectionMenu.x,
            top: selectionMenu.y,
            transform: "translate(-50%, 0)",
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            padding: "6px",
            zIndex: 1000,
            display: "grid",
            gap: "6px",
          }}
          role="dialog"
          aria-label="Selection edit menu"
        >
          <button type="button" onClick={() => applySelectionEdit("delete")}>
            delete selection
          </button>
          {selectionMenu.atEnd ? (
            <button type="button" onClick={() => applySelectionEdit("cut_prepend_next")}>
              cut and prepend to the beginning of next
            </button>
          ) : null}
          {selectionMenu.atStart ? (
            <button type="button" onClick={() => applySelectionEdit("cut_append_prev")}>
              cut and append to end of previous
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
