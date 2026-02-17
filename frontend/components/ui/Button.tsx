"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "fancy";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400 dark:active:bg-brand-600 shadow-soft hover:shadow-card-hover transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-600 active:bg-surface-300 dark:active:bg-surface-500 border border-surface-200/80 dark:border-surface-600 transition-all duration-200",
  ghost:
    "bg-transparent text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 active:bg-surface-200 dark:active:bg-surface-700 transition-colors duration-200",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-500 dark:hover:bg-red-400 transition-all duration-200",
  fancy: "btn-fancy",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

const GiftIcon = () => (
  <svg className="btn-fancy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
    <path d="M216 72h-36.72a31.76 31.76 0 0 0-4.24-10.32l32.49-20.31a8 8 0 0 0-8.9-13.32L166.78 48.4A31.92 31.92 0 0 0 136 32a32 32 0 0 0-30.78 16.4L97.61 28.05a8 8 0 0 0-8.9 13.32l32.49 20.31A31.76 31.76 0 0 0 116.72 72H40a16 16 0 0 0-16 16v16a16 16 0 0 0 16 16v72a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16v-72a16 16 0 0 0 16-16V88a16 16 0 0 0-16-16ZM136 48a16 16 0 0 1 14.31 8.84L136 64.43l-14.31-7.59A16 16 0 1 1 136 48ZM40 88h76v24H40Zm136 144H80v-56h96Zm0-72H80v-24h96v24Zm16-32v-16H40v16Z" />
  </svg>
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      fullWidth,
      loading,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const isFancy = variant === "fancy";
    const isDisabled = disabled || loading;

    if (isFancy) {
      return (
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          className={`btn-fancy ${fullWidth ? "!max-w-none w-full" : ""} ${className}`}
          {...props}
        >
          <div className="btn-fancy-left">
            {loading ? (
              <span className="inline-block w-6 h-6 border-2 border-amber-200/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GiftIcon />
            )}
          </div>
          <div className="btn-fancy-right">
            {loading ? null : children}
          </div>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          theme-transition ${variants[variant]} ${sizes[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
