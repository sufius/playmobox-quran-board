import surah from "./surat/wbw-surah-18.json";
import styles from "./page.module.css";

interface RowProps {
  index: number;
  verse: {
    text_uthmani_transcribed: string,
    text_uthmani_tajweed_parsed: string,
    translations: {
      "id": number,
      "resource_id": number,
      "text": string
    }[],
  }
}

const Row = ({index, verse}: RowProps) => {
  return <>
    <div className={`position-absolute btn-close translate-middle ${styles['button-' + index]}`}></div>
    <hr className={`position-absolute ${styles['button-' + index + '-divider']}`}></hr>
    <div className={`position-absolute translate-middle-y text-transcribed ${styles['button-' + index + '-transcribed']}`}>
        &#xFD3E;{index}&#xFD3F;&nbsp; 
        <span style={{whiteSpace: "nowrap"}}
          dangerouslySetInnerHTML={{__html:verse.text_uthmani_transcribed }} 
        ></span>
    </div>
    <div className={`position-absolute translate-middle-y text-translated ${styles['button-' + index + '-translated']}`}>
        &#xFD3E;{index}&#xFD3F;&nbsp;
        {verse.translations.find(item => item.resource_id == 27)?.text}
    </div>
    <div className={`position-absolute translate-middle-y noto-naskh-arabic-400 text-arabic ${styles['button-' + index + '-arabic']}`}>
        &#xFD3F;{index}&#xFD3E;&nbsp;
        <span style={{whiteSpace: "nowrap"}}
          dangerouslySetInnerHTML={{__html:verse.text_uthmani_tajweed_parsed }} 
        ></span>
    </div>
  </>;
};

export default function Home() {
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

        {Array.from({ length: 11 }).map((_, index) => (
          <Row key={index} index={index + 1} verse={surah.verses[index]} />
        ))}
    </>
  );
}
