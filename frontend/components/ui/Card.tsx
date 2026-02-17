"use client";

import { type HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  className = "",
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl bg-white dark:bg-surface-800 border border-surface-200/60 dark:border-surface-600/60 shadow-card dark:shadow-none
        theme-transition
        ${paddingMap[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold text-surface-900 dark:text-surface-100 ${className}`} {...props} />
  );
}
