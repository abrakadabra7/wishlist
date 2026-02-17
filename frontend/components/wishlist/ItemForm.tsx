"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { metadataApi } from "@/lib/api";

export interface ItemFormData {
  title: string;
  description: string;
  link_url: string;
  image_url: string;
  price?: number;
  currency?: string;
}

const CURRENCIES = [
  { code: "RUB", label: "RUB (₽)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "TRY", label: "TRY (₺)" },
  { code: "UZS", label: "UZS (so'm)" },
  { code: "KZT", label: "KZT (₸)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "UAH", label: "UAH (₴)" },
];

function isValidUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

export default function ItemForm({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (data: ItemFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { t } = useLanguage();

  async function fetchFromLink() {
    const url = linkUrl.trim();
    if (!isValidUrl(url)) {
      setFetchError(t("items.validUrlFirst"));
      return;
    }
    setFetchError(null);
    setFetchingMeta(true);
    try {
      const data = await metadataApi.get(url);
      if (data.title) setTitle(data.title);
      if (data.image_url) setImageUrl(data.image_url);
      if (data.price != null && !Number.isNaN(Number(data.price))) {
        setPrice(Number(data.price).toFixed(2));
      }
    } catch {
      setFetchError(t("items.fetchFailed"));
    } finally {
      setFetchingMeta(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = price.trim() ? parseFloat(price.trim()) : undefined;
    const hasPrice = priceNum !== undefined && !Number.isNaN(priceNum) && priceNum > 0;
    onSubmit({
      title: title.trim(),
      description: description.trim() || "",
      link_url: linkUrl.trim() || "",
      image_url: imageUrl.trim() || "",
      price: hasPrice ? priceNum : undefined,
      currency: hasPrice ? currency : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-surface-50/80 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-600 theme-transition">
      <div>
        <Input
          label={t("items.productLink")}
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder={t("items.productLinkPlaceholder")}
        />
        <div className="mt-1.5 flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={fetchingMeta}
            onClick={fetchFromLink}
            disabled={!linkUrl.trim()}
          >
            {t("items.fetchMeta")}
          </Button>
          {fetchError && (
            <span className="text-sm text-amber-700">{fetchError}</span>
          )}
        </div>
      </div>
      <Input
        label={t("items.itemName")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("items.itemNamePlaceholder")}
        maxLength={300}
        required
      />
      <Input
        label={t("items.descriptionOptional")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("items.descriptionPlaceholder")}
        maxLength={1000}
      />
      <Input
        label={t("items.imageUrlOptional")}
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://..."
      />
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[120px]">
          <Input
            label={t("items.priceOptional")}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="w-32 shrink-0">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1 theme-transition">
            {t("items.currency")}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 bg-white/80 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400 theme-transition"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={loading} disabled={!title.trim()}>
          {t("items.addItem")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
