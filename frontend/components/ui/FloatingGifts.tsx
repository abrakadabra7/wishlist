"use client";

import { useState, useCallback } from "react";

const PRESENTS = ["🎀", "✨", "💝", "🌟", "🎉"];
const CLOSED_GIFTS = ["🎁", "📦", "🎀"];
const MAX_GIFTS = 12;
const INITIAL_COUNT = 10;

function randomBetween(a: number, b: number) {
  return Math.round(a + Math.random() * (b - a));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type GiftBox = {
  id: string;
  left: string;
  top: string;
  delay: number;
  status: "idle" | "opening";
  closedEmoji: string;
  openEmoji?: string;
};

function createGift(overrides?: Partial<GiftBox>): GiftBox {
  return {
    id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    left: `${randomBetween(6, 90)}%`,
    top: `${randomBetween(10, 78)}%`,
    delay: Math.random() * 1.5,
    status: "idle",
    closedEmoji: pickRandom(CLOSED_GIFTS),
    ...overrides,
  };
}

function createInitialGifts(): GiftBox[] {
  return Array.from({ length: INITIAL_COUNT }, (_, i) =>
    createGift({ id: `gift-initial-${i}` })
  );
}

export default function FloatingGifts() {
  const [giftBoxes, setGiftBoxes] = useState<GiftBox[]>(createInitialGifts);

  const handleGiftClick = useCallback((id: string) => {
    const openEmoji = pickRandom(PRESENTS);
    setGiftBoxes((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, status: "opening" as const, openEmoji } : g
      )
    );
    setTimeout(() => {
      setGiftBoxes((prev) => {
        const next = prev.filter((g) => g.id !== id);
        const newOnes = [createGift()];
        return [...next, ...newOnes].slice(-MAX_GIFTS);
      });
    }, 480);
  }, []);

  return (
    <div className="absolute inset-0 overflow-visible z-0" aria-hidden>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-200/25 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-48 h-48 bg-amber-100/25 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 pointer-events-auto">
          {giftBoxes.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => g.status === "idle" && handleGiftClick(g.id)}
              className={`absolute cursor-pointer select-none touch-manipulation transition-transform active:scale-95 ${
                g.status === "opening" ? "gift-box-open" : "lists-float"
              }`}
              style={{
                left: g.left,
                top: g.top,
                transform: "translate(-50%, -50%)",
                animationDelay: g.status === "idle" ? `${g.delay}s` : undefined,
              }}
              aria-label="Open gift"
            >
              <span className="text-2xl sm:text-3xl opacity-70 hover:opacity-95 hover:scale-110 block transition-opacity duration-200">
                {g.status === "opening" ? g.openEmoji ?? "🎀" : g.closedEmoji}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
