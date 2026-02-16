"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function extractTokenFromUrl(url: string): string | null {
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    return u.searchParams.get("token");
  } catch {
    if (trimmed.includes("token=")) {
      const m = trimmed.match(/[?&]token=([^&]+)/);
      return m ? m[1] : null;
    }
    return null;
  }
}

export default function OpenByLinkPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = extractTokenFromUrl(url);
    if (!token) {
      setError(t("openByLink.pasteFullLink"));
      return;
    }
    router.push(`/public/list?token=${encodeURIComponent(token)}`);
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Link href="/lists" className="text-sm text-surface-500 hover:text-brand-600 inline-block mb-2">
          {t("openByLink.backToMyLists")}
        </Link>
        <h1 className="text-2xl font-semibold text-surface-900">{t("openByLink.title")}</h1>
        <p className="mt-1 text-surface-500">
          {t("openByLink.desc")}
        </p>
      </div>
      <Card padding="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("openByLink.wishlistLink")}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("openByLink.linkPlaceholder")}
          />
          {error && (
            <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button type="submit" fullWidth disabled={!url.trim()}>
            {t("openByLink.openWishlist")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
