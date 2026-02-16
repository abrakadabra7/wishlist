"use client";

import { useId } from "react";
import Link from "next/link";

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

export default function Logo({
  href = "/lists",
  size = "md",
  className = "",
}: {
  href?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const boxId = `logo-box-${id}`;
  const lidId = `logo-lid-${id}`;
  const s = sizeClasses[size];
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus:opacity-90 ${className}`}
      aria-label="Home"
    >
      <svg
        className={`${s} flex-shrink-0`}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M8 14h24v18H8V14z"
          fill={`url(#${boxId})`}
          stroke="#b86244"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M6 14h28l-2-6H8l-2 6z"
          fill={`url(#${lidId})`}
          stroke="#994f39"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M20 8v26" stroke="#cc7a5c" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 18h24" stroke="#cc7a5c" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M14 8c0-2.2 1.8-4 4-4s4 1.8 4 4"
          stroke="#b86244"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M26 8c0-2.2-1.8-4-4-4s-4 1.8-4 4"
          stroke="#b86244"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient id={boxId} x1="8" y1="14" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f2d9ce" />
            <stop offset="0.5" stopColor="#e8bfad" />
            <stop offset="1" stopColor="#da9a7e" />
          </linearGradient>
          <linearGradient id={lidId} x1="6" y1="8" x2="34" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f9ede8" />
            <stop offset="0.5" stopColor="#e8bfad" />
            <stop offset="1" stopColor="#cc7a5c" />
          </linearGradient>
        </defs>
      </svg>
    </Link>
  );
}
