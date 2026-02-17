"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl border bg-white/80 dark:bg-surface-800/80
            text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-400
            focus:ring-2 focus:ring-brand-500/25 dark:focus:ring-brand-400/30 focus:border-brand-400 dark:focus:border-brand-500
            theme-transition
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 dark:border-red-400" : "border-surface-200 dark:border-surface-600"}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
