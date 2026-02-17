"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { wishlistApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Wishlist } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";

export default function EditListPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const { t } = useLanguage();
  const [list, setList] = useState<Wishlist | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    wishlistApi
      .get(id)
      .then((data) => {
        setList(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        setDueDate(data.due_date ? data.due_date.slice(0, 10) : "");
      })
      .catch(() => setFetchError(t("lists.couldNotLoadList")));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!list || list.owner_id !== user?.id) return;
    setError("");
    setLoading(true);
    try {
      await wishlistApi.update(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate.trim() || null,
      });
      router.push(`/lists/${id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("lists.failedUpdate"));
    } finally {
      setLoading(false);
    }
  }

  if (fetchError || (list && user && list.owner_id !== user.id)) {
    return (
      <div className="max-w-lg">
        <Link href={`/lists/${id}`} className="text-sm text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 theme-transition mb-4 inline-block">
          {t("common.backToList")}
        </Link>
        <Card className="py-8 text-center text-surface-600 dark:text-surface-300 theme-transition">
          {fetchError ?? t("lists.cantEditList")}
        </Card>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="max-w-lg">
        <div className="h-4 w-24 rounded bg-surface-200 dark:bg-surface-600 animate-pulse mb-4 theme-transition" />
        <Card className="p-6">
          <div className="h-8 w-48 rounded bg-surface-200 dark:bg-surface-600 animate-pulse theme-transition" />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/lists/${id}`}
        className="text-sm text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 theme-transition mb-4 inline-block"
      >
        {t("common.backToList")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("lists.editWishlist")}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("lists.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("lists.titlePlaceholder")}
            maxLength={200}
            required
          />
          <label className="block">
            <span className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1 theme-transition">
              {t("lists.descriptionOptional")}
            </span>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none theme-transition"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lists.descriptionPlaceholder")}
              maxLength={2000}
            />
          </label>
          <label className="block">
<span className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1 theme-transition">
            {t("lists.dueDateOptional")}
          </span>
          <input
            type="date"
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 theme-transition"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400 theme-transition">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              {t("common.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push(`/lists/${id}`)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
