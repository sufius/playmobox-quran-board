"use client"

import { use, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";


interface BoardProps {
  params: Promise<{
    surah: number;
    lang: string;
  }>
}

interface VerseProps {
  hizb_number: number;
  id: number;
  juz_number: number;
  manzil_number: number;
  page_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  sajdah_number: number | null;
  text_uthmani: string;
  text_uthmani_tajweed: string;
  text_uthmani_tajweed_parsed: string;
  text_uthmani_transcribed: string;
  translations: {
    "id": number;
    "resource_id": number;
    "text": string;
  }[];
  verse_key: number;
  verse_number: number;
  words: {
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

interface GetTextWidthFunction extends Function {
  canvas?: HTMLCanvasElement;
}

const convertToArabicNumerals = (latinNumber: number | string) => latinNumber.toString().replace(/\d/g, (digit: string) => '٠١٢٣٤٥٦٧٨٩'[parseInt(digit, 10)]);
type LanguagesProps = { [key: number]: string };
type LanguagesFlippedProps = { [key: string]: number };
const f = (obj: LanguagesProps) => Object.fromEntries(Object.entries(obj).map(a => a.reverse()))
const languages: LanguagesProps = {
  27: "de",
  19: "en",
  45: "ru",
};
const languagesFlipped: LanguagesFlippedProps = f(languages);
/**
  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
  * 
  * @param {String} text The text to be rendered.
  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
  * 
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  */
const getTextWidth: GetTextWidthFunction = function (text: string, font: string): number {
  // re-use canvas object for better performance
  const canvas: HTMLCanvasElement = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get canvas context");
  }
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}
function getCssStyle(element: Element | HTMLSpanElement | null, prop: string) {
  return element && window.getComputedStyle(element, null).getPropertyValue(prop);
}
function getCanvasFont(el: HTMLElement | null = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
}


const Verse = ({
  languageId,
  verse_number,
  text_uthmani_transcribed,
  text_uthmani_tajweed_parsed,
  translations
}: VerseProps & { languageId: number }) => {
  const [transcriptedTextWidth, setTranscriptedTextWidth] = useState(0); // State to store the value
  const [translatedTextWidth, setTranslatedTextWidth] = useState(0); // State to store the value
  const [arabicTextWidth, setArabicTextWidth] = useState(0); // State to store the value
  const transcriptedTextRef = useRef<HTMLElement>(null);
  const translatedTextRef = useRef<HTMLElement>(null);
  const arabicTextRef = useRef<HTMLElement>(null);
  const text_arabic = useMemo(() => translations.find(item => item.resource_id == languageId)?.text, [translations]);
  const textWidthThreshold = 1025;

  useEffect(() => {
      console.log('useEffect', arabicTextRef.current);
      if (transcriptedTextRef.current) {
        setTranscriptedTextWidth(getTextWidth(transcriptedTextRef.current?.innerText, getCanvasFont(transcriptedTextRef.current)));
      }
      if (translatedTextRef.current) {
        setTranslatedTextWidth(getTextWidth(translatedTextRef.current?.innerText, getCanvasFont(translatedTextRef.current)));
      }
      if (arabicTextRef.current) {
        setArabicTextWidth(getTextWidth(arabicTextRef.current?.innerText, getCanvasFont(arabicTextRef.current)));
      }
  }, [text_uthmani_transcribed, text_uthmani_tajweed_parsed, text_arabic]);

  return <>
    <span 
      ref={transcriptedTextRef}
      style={{
        whiteSpace: "nowrap",
        top: `${4.9 + (verse_number - 1) * 21.3}mm`,
        left: "58.0mm",
        right: "13mm",
        lineHeight: "0.8rem",
        color: (transcriptedTextWidth > textWidthThreshold) ? "darkred" : "none"
      }}
      className={`position-absolute translate-middle-y text-transcribed`}
      dangerouslySetInnerHTML={{ __html: `&#xFD3E;${verse_number}&#xFD3F; ${text_uthmani_transcribed}` }}
    />
    <span
      ref={translatedTextRef}
      style={{
        whiteSpace: "nowrap", 
        top: `${10.9 + (verse_number - 1) * 21.3}mm`, 
        left: "58.0mm", 
        right: "13mm", 
        lineHeight: "0.8rem",
        color: (translatedTextWidth > textWidthThreshold) ? "darkred" : "none"
      }}
      className={`position-absolute translate-middle-y text-translated`}
    >
      &#xFD3E;{verse_number}&#xFD3F; {text_arabic}
    </span>
    <span
      ref={arabicTextRef}
      className={`position-absolute translate-middle-y noto-naskh-arabic-400 text-arabic`}
      style={{ 
        whiteSpace: "nowrap", 
        top: `${18.9 + (verse_number - 1) * 21.3}mm`, 
        right: "5mm",
        color: (arabicTextWidth > textWidthThreshold) ? "darkred" : "none"
      }}
      dangerouslySetInnerHTML={{ __html: `&#xFD3F;${convertToArabicNumerals(verse_number)}&#xFD3E; ${text_uthmani_tajweed_parsed}` }}
    />
    <hr
      style={{ top: `${18.5 + (verse_number - 1) * 21.3}mm`, left: "58.0mm", right: "15.0mm" }}
      className={`position-absolute`}
    />
  </>;
};


export default function Board({ params }: BoardProps) {
  const { surah = 1, lang = "de" } = use(params);
  const [data, setData] = useState<SurahProps | null>(null);
  const [rows, setRows] = useState<SurahProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically load the JSON file based on the param
    import(`@/app/data/surah-${surah}.json`)
      .then((module) => {
        setData(module.default as SurahProps); // The default export of the imported module
        setRows(module.default as SurahProps); // The default export of the imported module
      })
      .catch((err) => {
        setError('File not found or an error occurred');
        console.error(err);
      });
  }, [surah]);

  if (!data || !rows) {
    return <>...Loading</>
  }
  console.log('Board');

  return (
    <div className={styles["page"]} style={{ height: `${rows.verses.length * 21.3}mm` }}>
      <h6 className="position-absolute pmb-text-primary surah-number">
        s&#363;rah: {data.chapter_number}
      </h6>
      <h6 className="position-absolute pmb-text-primary ayat-numbers">
        ʾāyāt: 1-11 [{data.number_of_ayahs}]
      </h6>
      <h6 className="position-absolute surah-name-transcribed text-transcribed">
        {data.chapter_name_transcribed}
      </h6>
      <h6 className="position-absolute text-translated surah-name-translated text-transcribed">
        {data.chapter_name_translated[lang].name}
      </h6>
      <h6 className="position-absolute surah-name-arabic noto-naskh-arabic-400 text-arabic">
        {data.chapter_name_arabic}
      </h6>

      <img className="position-absolute bismillah-image" src="/bismillah.svg" alt="Bismillāhir-raḥmānir-raḥīm(i)" width="150" />
      <h6 className="position-absolute bismillah-image-transcribed text-transcribed">
        Bismillāhir-raḥmānir-raḥīm(i)
      </h6>

      <span className="d-none position-absolute pmb-module-footprint border border-1 bg-gradient"></span>
      <span className="d-none position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span>

      {data.verses.map((verse, index) => (
        <Verse
          key={index}
          languageId={languagesFlipped[lang]}
          {...verse}
        />
      ))}
    </div>
  );
}