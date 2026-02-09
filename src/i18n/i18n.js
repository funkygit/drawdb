import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { en, english } from "./locales/en";
import { zh, chinese } from "./locales/zh";
import { vi, vietnamese } from "./locales/vi";
import { ko, korean } from "./locales/ko";
import { th, thai } from "./locales/th";
import { tl, filipino } from "./locales/tl";
import { zh_tw, traditionalChinese } from "./locales/zh-tw";

export const languages = [
  english,
  chinese,
  vietnamese,
  korean,
  thai,
  filipino,
  traditionalChinese,
].sort((a, b) => a.name.localeCompare(b.name));

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en,
      zh,
      vi,
      ko,
      th,
      tl,
      "zh-TW": zh_tw,
    },
  });

export default i18n;