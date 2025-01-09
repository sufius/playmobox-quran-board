"use client"

import { use, useEffect, useState } from "react";
import styles from "./page.module.css";


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

const Verse = (
  {
  languageId,
  verse_number,
  text_uthmani_transcribed,
  text_uthmani_tajweed_parsed,
  translations
}: VerseProps & { languageId: number }) => {
  return <>
    <div className={`position-absolute btn-close translate-middle ${styles['button-' + verse_number]}`}></div>
    <hr className={`position-absolute ${styles['button-' + verse_number + '-divider']}`}></hr>
    <div className={`position-absolute translate-middle-y text-transcribed ${styles['button-' + verse_number + '-transcribed']}`}>
        &#xFD3E;{verse_number}&#xFD3F;&nbsp; 
        <span style={{whiteSpace: "nowrap"}}
          dangerouslySetInnerHTML={{__html: text_uthmani_transcribed }} 
        ></span>
    </div>
    <div className={`position-absolute translate-middle-y text-translated ${styles['button-' + verse_number + '-translated']}`}>
        &#xFD3E;{verse_number}&#xFD3F;&nbsp;
        {translations.find(item => item.resource_id == languageId)?.text}
    </div>
    <div className={`position-absolute translate-middle-y noto-naskh-arabic-400 text-arabic ${styles['button-' + verse_number + '-arabic']}`}>
        <span>
          {convertToArabicNumerals(verse_number)}
          &#8205;
          &#x06DD;
        </span>&nbsp;
        <span style={{whiteSpace: "nowrap"}}
          dangerouslySetInnerHTML={{__html: text_uthmani_tajweed_parsed }} 
        ></span>
    </div>
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically load the JSON file based on the param
    import(`./data/surah-${surah}.json`)
      .then((module) => {
        setData(module.default); // The default export of the imported module
      })
      .catch((err) => {
        setError('File not found or an error occurred');
        console.error(err);
      });
  }, [surah]);
 
  if (!data) {
    return <>...Loading</>
  }

  return (
    <>
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

        <span className="position-absolute pmb-module-footprint border border-1 bg-gradient"></span> 
        <span className="position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span> 

        {data.verses.map((verse, index) => (
          <Verse key={index} languageId={languagesFlipped[lang]} {...verse} />
        ))}
    </>
  );
}
