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
      <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-64 h-64 sm:w-80 sm:h-80 bg-brand-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 sm:w-96 sm:h-96 bg-brand-100/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-amber-100/40 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative z-10">
          {/* Left column: text + actions */}
          <section className="flex-1 space-y-5 text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center justify-center rounded-full bg-white/80 border border-surface-200/70 px-3 py-1 text-xs sm:text-sm text-surface-600 shadow-sm mb-2">
              <span className="mr-1.5 text-base">🎁</span>
              <span>{t("app.tagline")}</span>
            </div>
            <h1 className="text-4xl font-bold text-surface-900 sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              {t("app.tagline")}
            </h1>
            <p className="text-surface-600 text-lg sm:text-xl max-w-md mx-auto lg:mx-0 leading-relaxed">
              {t("app.taglineDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center pt-1">
              <Link href="/register" className="w-full sm:w-auto inline-flex justify-center">
                <Button variant="fancy" fullWidth className="sm:!max-w-[280px]">
                  {t("app.createAccount")}
                </Button>
              </Link>
              <Link href="/login" className="inline-block w-full sm:w-auto">
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
            <p className="text-xs sm:text-sm text-surface-500 pt-1">
              {locale === "ru"
                ? "Создай вишлист за 30 секунд — друзья увидят, что забронировано и на что скинуться."
                : "Create a wishlist in seconds so friends see what’s reserved and what they can chip in for."}
            </p>
          </section>

          {/* Right column: animated demo cards (decorative, not interactive) */}
          <section className="flex-1 w-full max-w-md lg:max-w-lg">
            <div className="relative">
              {/* Main big card */}
              <div className="hero-card-main rounded-3xl bg-white/95 shadow-2xl border border-surface-100/80 p-4 sm:p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-300 flex items-center justify-center text-2xl">
                    🎧
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-surface-400">
                          Wishlist · Пример
                        </p>
                        <h2 className="text-base sm:text-lg font-semibold text-surface-900">
                          AirPods Pro
                        </h2>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1">
                        {locale === "ru" ? "Зарезервировано" : "Reserved"}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500">
                      {locale === "ru"
                        ? "Друзья уже забронировали этот подарок."
                        : "Friends have already reserved this gift for you."}
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                      </div>
                      <div className="flex justify-between text-[11px] text-surface-500">
                        <span>{locale === "ru" ? "Оплачено" : "Paid"} · 28 000 ₽</span>
                        <span>42 000 ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary card on the right */}
              <div className="hero-card-secondary absolute -right-4 sm:-right-10 -bottom-10 sm:-bottom-12 w-40 sm:w-48 rounded-2xl bg-white shadow-xl border border-surface-100/80 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-300 flex items-center justify-center text-lg">
                    📱
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-surface-900">iPhone 13</p>
                    <p className="text-[11px] text-surface-500">80 000 ₽</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="inline-flex-1 inline-flex justify-center items-center rounded-full bg-brand-500 text-white text-[10px] px-2 py-1">
                    {locale === "ru" ? "Скинуться" : "Chip in"}
                  </span>
                  <span className="inline-flex justify-center items-center rounded-full bg-surface-100 text-surface-700 text-[10px] px-2 py-1">
                    {locale === "ru" ? "Забронировать" : "Reserve"}
                  </span>
                </div>
              </div>

              {/* How it works mini-steps */}
              <div className="hidden sm:flex hero-card-steps absolute -left-6 -bottom-14 bg-white/90 border border-surface-100 rounded-2xl shadow-lg px-3 py-2.5 items-center gap-3">
                <div className="flex flex-col gap-1 text-[11px] text-surface-600">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white text-[9px]">
                      1
                    </span>
                    <span>{locale === "ru" ? "Создай вишлист" : "Create wishlist"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white text-[9px]">
                      2
                    </span>
                    <span>{locale === "ru" ? "Поделись ссылкой" : "Share link"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white text-[9px]">
                      3
                    </span>
                    <span>{locale === "ru" ? "Друзья скидываются" : "Friends reserve & chip in"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
