"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import Button from "@/components/ui/Button";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import Logo from "@/components/layout/Logo";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200/60 bg-white/80 dark:border-surface-700/60 dark:bg-surface-900/90 backdrop-blur-xl shadow-sm theme-transition">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:px-6 sm:py-0 sm:gap-0">
        <Logo href="/lists" size="md" className="shrink-0" />
        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors theme-transition"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-800/80 p-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                locale === "en"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm"
                  : "text-surface-500 dark:text-surface-300 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("ru")}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                locale === "ru"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm"
                  : "text-surface-500 dark:text-surface-300 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              RU
            </button>
          </div>
          {user ? (
            <>
              <Link
                href="/lists"
                className={`text-xs font-medium px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap sm:text-sm sm:px-3 sm:py-2 ${
                  pathname === "/lists"
                    ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50"
                    : "text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                }`}
              >
                {t("nav.myLists")}
              </Link>
              <Link
                href="/open"
                className={`text-xs font-medium px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap sm:text-sm sm:px-3 sm:py-2 ${
                  pathname === "/open"
                    ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50"
                    : "text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                }`}
              >
                {t("nav.openByLink")}
              </Link>
              <NotificationsDropdown />
              <span className="hidden text-sm text-surface-500 dark:text-surface-300 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200 theme-transition md:inline">
                {user.display_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout} className="shrink-0 px-2 py-1.5 text-xs transition-colors duration-200 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-800 dark:hover:text-surface-200 sm:px-3 sm:text-sm">
                {t("nav.logOut")}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  {t("nav.logIn")}
                </Button>
              </Link>
              <Link href="/register" className="shrink-0">
                <Button variant="primary" size="sm" className="text-xs sm:text-sm">
                  {t("nav.signUp")}
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
