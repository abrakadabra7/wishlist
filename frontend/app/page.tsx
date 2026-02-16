"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Logo from "@/components/layout/Logo";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, locale, setLocale } = useLanguage();

  useEffect(() => {
    if (!loading && user) router.replace("/lists");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <header className="border-b border-surface-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 py-3 flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:px-4 sm:py-4 sm:gap-0">
          <Logo href="/" size="lg" className="shrink-0" />
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <div className="flex items-center gap-0.5 rounded-lg border border-surface-200 bg-surface-50/80 p-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                  locale === "en" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("ru")}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                  locale === "ru" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
                }`}
              >
                RU
              </button>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <Link href="/login" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">{t("nav.logIn")}</Button>
              </Link>
              <Link href="/register" className="shrink-0">
                <Button size="sm" className="text-xs sm:text-sm bg-gradient-brand hover:opacity-95 shadow-soft border-0">{t("nav.signUp")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 sm:py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl mx-auto space-y-8 relative z-10 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-4xl shadow-card animate-float">
            🎁
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-surface-900 sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              {t("app.tagline")}
            </h1>
            <p className="text-surface-600 text-lg sm:text-xl max-w-md mx-auto leading-relaxed">
              {t("app.taglineDesc")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <Link href="/register" className="w-full sm:w-auto inline-flex justify-center">
              <Button variant="fancy" fullWidth className="sm:!max-w-[280px]">
                {t("app.createAccount")}
              </Button>
            </Link>
            <Link href="/login" className="inline-block">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                className="sm:w-auto rounded-xl border border-surface-200/80 bg-white/80 shadow-card transition-all duration-200 hover:bg-brand-50/80 hover:border-brand-200/70 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("app.haveAccount")}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
