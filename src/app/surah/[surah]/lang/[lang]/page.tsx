"use client"

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";


interface VerseProps {
  hizb_number?: number;
  id?: number;
  juz_number?: number;
  manzil_number?: number;
  page_number?: number;
  rub_el_hizb_number?: number;
  ruku_number?: number;
  sajdah_number?: number | null;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  text_uthmani_tajweed_parsed?: string;
  text_uthmani_transcribed: string;
  translations?: {
    "id": number;
    "resource_id": number;
    "text": string;
  }[];
  translation: string;
  splitted: {
    text_uthmani: string;
    text_uthmani_transcribed: string;
    translation: string;
  };
  verse_key?: number;
  verse_number: number;
  belongs_to_verse_number: number;
  words?: {
    audio_url: string;
    char_type_name: string;
    code_v1: string;
    id: number;
    line_number: number;
    page_number: number;
    position: number;
    text: string;
    text_uthmani: string;
    translation: {
      language_name: string;
      text: string;
    };
    transliteration: {
      language_name: string;
      text: string;
    };
  }[];
}[];

interface SurahProps {
  chapter_name_arabic: string;
  chapter_name_transcribed: string;
  chapter_name_translated: {
    [key: string]: {
      language_name: string;
      name: string;
    }
  };
  chapter_name_transliterated: string;
  chapter_number: number;
  number_of_ayahs: number;
  pages: number[];
  revelation_order: number;
  revelation_place: string;
  verses: VerseProps[]
};


const convertToArabicNumerals = (latinNumber: number | string) => latinNumber.toString().replace(/\d/g, (digit: string) => '٠١٢٣٤٥٦٧٨٩'[parseInt(digit, 10)]);
type LanguagesProps = { [key:number]: string };
type LanguagesFlippedProps = { [key:string]: number };
const f = (obj: LanguagesProps) => Object.fromEntries(Object.entries(obj).map(a => a.reverse()))
const languages: LanguagesProps = {
  27: "de",
  19: "en",
  45: "ru",
};
const languagesFlipped: LanguagesFlippedProps = f(languages);


async function fetchJSONFiles(surah: number): Promise<VerseProps[] | undefined> {
  const directory = "/boards/"; // JSON files location
  const regex = new RegExp(`surah-${surah}_part\\d+-splitted\\.json$`); // Dynamic regex based on surah number

  try {
    // Ideally, this should come from a dynamic file index, but for now, it's hardcoded
    const fileList = [
      "surah-18_part1-splitted.json",
      "surah-18_part2-splitted.json"
    ]; // Replace with dynamic fetching if possible

    const jsonPromises = fileList
      .filter(file => regex.test(file)) // Filter based on dynamic Surah regex
      .map(async file => {
        const response = await fetch(`${directory}${file}`);
        if (!response.ok) throw new Error(`Failed to load ${file}`);
        return response.json();
      });

    const jsonFiles = await Promise.all(jsonPromises);
    // console.log(`Loaded JSON files for Surah ${surah}:`, jsonFiles);
    // console.log(`Loaded JSON files for Surah ${surah}:`, jsonFiles.flat().map(verse => verse.splitted || verse));
    return jsonFiles.flat().map(verse => {
      if (verse.splitted) {
        verse.splitted[0].verse_number = verse.verse_number;
      }
      return verse.splitted || verse
    }).flat()
  } catch (error) {
    console.error("Error loading JSON files:", error);
  }
}

const Verse = ({
  index,
  verse_number,
  text_uthmani,
  text_uthmani_transcribed,
  translation,
}: VerseProps & { index: number }) => {

  return <>
    <div className={`d-none position-absolute btn-close translate-middle ${styles['button-' + index]}`}></div>
    <span 
      style={{whiteSpace: "nowrap"}}
      className={`position-absolute translate-middle-y text-transcribed ${styles['button-' + index + '-transcribed']}`}
      dangerouslySetInnerHTML={{__html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${text_uthmani_transcribed}` : text_uthmani_transcribed }} 
    />
    <span
      className={`position-absolute translate-middle-y text-translated ${styles['button-' + index + '-translated']}`}
      dangerouslySetInnerHTML={{__html: verse_number ? `&#xFD3E;${verse_number}&#xFD3F; ${translation}` : translation }}
    />
    <span
        style={{whiteSpace: "nowrap"}}
        className={`position-absolute translate-middle-y arabic-font-400 text-arabic ${styles['button-' + index + '-arabic']}`}
        dangerouslySetInnerHTML={{__html: verse_number ? 
          `&#xFD3F;${convertToArabicNumerals(verse_number)}&#xFD3E; ${text_uthmani}` : text_uthmani }} 
    />
    <hr className={`position-absolute ${styles['button-' + index + '-divider']}`}/>
  </>;
};

interface BoardProps {
  params: Promise<{
    surah: number;
    lang: string;
  }>
}

export default function Board({params}: BoardProps) {
  const { surah = 1, lang = "de" } = use(params);
  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<VerseProps[] | undefined>([]);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const start =  Number(searchParams.get("start")) || 0;  

  useEffect(() => {
    // Dynamically load the JSON file based on the param
    import(`@/app/data/surah-${surah}.json`)
      .then(async (module) => {
        setData(module.default); // The default export of the imported module
        let mergedSplittedVerses = await fetchJSONFiles(surah);
        setRows(mergedSplittedVerses);
        // console.log('fetchJSONFiles(surah)', mergedSplittedVerses);
      })
      .catch((err) => {
        setError('File not found or an error occurred');
        console.error(err);
      });
  }, [surah]);
 
  if (!data || !rows) {
    return <>...Loading</>
  }

  return (
    <div className={styles["page"]}>
        <h6 className="position-absolute pmb-text-primary surah-number">
            <b>s&#363;rah: {data.chapter_number}</b>
        </h6>
        <h6 className="position-absolute pmb-text-primary ayat-numbers">
            <b>ʾāyāt: {rows[start]?.verse_number || rows[start]?.belongs_to_verse_number}-{rows[start+10]?.verse_number || rows[start+10]?.belongs_to_verse_number} [{data.number_of_ayahs}]</b>
        </h6>
        <h6 className="position-absolute surah-name-transcribed text-transcribed">
            {data.chapter_name_transcribed}
        </h6>
        <h6 className="position-absolute text-translated surah-name-translated text-transcribed">
            {data.chapter_name_translated[lang].name}
        </h6>
        <h6 className="position-absolute surah-name-arabic arabic-font-400 text-arabic">
          {data.chapter_name_arabic}
        </h6>

        <img className="position-absolute bismillah-image" src="/bismillah.svg" alt="Bismillāhir-raḥmānir-raḥīm(i)" width="150" />
        <h6 className="position-absolute bismillah-image-transcribed text-transcribed">
          Bismillāhir-raḥmānir-raḥīm(i)
        </h6>

        <span className="d-none position-absolute pmb-module-footprint border border-1 bg-gradient"></span> 
        <span className="d-none position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span> 

        {rows.slice(start, start + 11).map((verse, index) => (
          <Verse 
            key={index}
            index={index+1}
            {...verse} 
          />
        ))}
    </div>
  );
}
