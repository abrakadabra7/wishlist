"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import Logo from "@/components/layout/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200/60 bg-white/80 dark:border-surface-700/60 dark:bg-surface-900/90 backdrop-blur-xl shadow-sm theme-transition">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:px-6 sm:py-0 sm:gap-0">
        <Logo href="/lists" size="md" className="shrink-0" />
        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap sm:gap-3">
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
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
