"use client"

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useParams } from 'next/navigation';

interface BoardProps {
  params: {surah: number}
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


const Verse = (
  {
  languageNumber,
  verse_number,
  text_uthmani_transcribed,
  text_uthmani_tajweed_parsed,
  translations
}: VerseProps & { languageNumber: number }) => {
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
        {translations.find(item => item.resource_id == languageNumber)?.text}
    </div>
    <div className={`position-absolute translate-middle-y noto-naskh-arabic-400 text-arabic ${styles['button-' + verse_number + '-arabic']}`}>
        &#xFD3F;{verse_number}&#xFD3E;&nbsp;
        <span style={{whiteSpace: "nowrap"}}
          dangerouslySetInnerHTML={{__html: text_uthmani_tajweed_parsed }} 
        ></span>
    </div>
  </>;
};

export default function Board<BoardProps>() {
  const params = useParams();
  const { surah } = params;

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
            s&#363;rah: 18
        </h6>
        <h6 className="position-absolute pmb-text-primary ayat-numbers">
            ʾāyāt: 1-11 [110]
        </h6>
        <h6 className="position-absolute surah-name-transcribed text-transcribed">
            S&#363;rat<span title='HamztWslA' className= 'HamztWslA'> A&#8205;</span>&#8205;l-Kahf
        </h6>
        <h6 className="position-absolute text-translated surah-name-translated text-transcribed">
            Sure: die Höhle
        </h6>
        <h6 className="position-absolute surah-name-arabic noto-naskh-arabic-400 text-arabic">
            سُورَة الكَهف
        </h6>

        <span className="position-absolute pmb-module-footprint border border-1 bg-gradient"></span> 
        <span className="position-absolute pmb-module-usb-footprint border border-1 bg-gradient"></span> 

        {data.verses.map((verse, index) => (
          <Verse key={index} languageNumber={27} {...verse} />
        ))}
    </>
  );
}
