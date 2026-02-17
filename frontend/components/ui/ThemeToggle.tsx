"use client";

import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="shrink-0">
      <label
        htmlFor="theme-switch"
        className="w-14 h-14 rounded-full bg-white dark:bg-surface-800 cursor-pointer grid place-items-center shadow-[0_0_50px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_15px_rgba(0,0,0,0.2)] theme-transition"
        aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      >
        <input
          type="checkbox"
          id="theme-switch"
          checked={isLight}
          onChange={toggleTheme}
          className="sr-only"
        />
        <span className="grid grid-cols-1 grid-rows-1 place-items-center w-8 h-8">
          {/* Moon — виден в dark mode */}
          <span
            className={`col-start-1 row-start-1 w-8 h-8 transition-all duration-500 ease-in-out ${
              isLight ? "scale-0 rotate-[360deg]" : "scale-100 rotate-0"
            }`}
            style={isLight ? { transitionDelay: "0ms" } : { transitionDelay: "200ms" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-surface-700 dark:text-surface-200">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
          </span>
          {/* Sun — виден в light mode */}
          <span
            className={`col-start-1 row-start-1 w-8 h-8 transition-all duration-500 ease-in-out ${
              isLight ? "scale-100 rotate-[360deg]" : "scale-0 rotate-0"
            }`}
            style={isLight ? { transitionDelay: "200ms" } : { transitionDelay: "0ms" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-surface-700 dark:text-surface-200">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          </span>
        </span>
      </label>
    </div>
  );
}
