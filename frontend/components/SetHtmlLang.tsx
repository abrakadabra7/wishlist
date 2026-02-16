"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SetHtmlLang() {
  const { locale } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = locale === "ru" ? "ru" : "en";
  }, [locale]);
  return null;
}
