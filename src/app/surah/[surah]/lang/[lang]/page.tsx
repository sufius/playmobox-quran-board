"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

/* =========================
   Types (as provided)
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

const languages: LanguagesProps = {
  27: "de",
  19: "en",
  45: "ru",
};
const languagesFlipped: LanguagesFlippedProps = flip(languages);

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
  displayIndex: number; // 1..11 for positioning
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
  // Note: using `use(params)` in a client component can cause hydration warnings;
  // keep as-is per your current approach.
  const { surah = 1, lang = "de" } = use(params);

  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<VerseProps[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const start = Number(searchParams.get("start")) || 0;

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

  const startAyah = rows[start]?.verse_number ?? rows[start]?.index ?? 0;
  const endAyah = rows[start + 10]?.verse_number ?? rows[start + 10]?.index ?? 0;

  return (
    <div className={styles["page"]}>
      <h6 className="position-absolute pmb-text-primary surah-number">
        <b>s&#363;rah: {data.chapter_number}</b>
      </h6>

      <h6 className="position-absolute pmb-text-primary ayat-numbers">
        <b>
          ʾāyāt: {startAyah}-{endAyah} [{data.number_of_ayahs}]
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

      {rows.slice(start, start + 11).map((verse, i) => (
        <Verse key={`${verse.index}-${i}`} displayIndex={i + 1} verse={verse} />
      ))}
    </div>
  );
}
