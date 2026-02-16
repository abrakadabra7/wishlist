"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { wishlistApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { LIST_TEMPLATES, getTemplateById, type ListTemplateId } from "@/lib/templates";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewListPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<ListTemplateId | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSelectTemplate(id: ListTemplateId) {
    setSelectedTemplateId(id);
    const template = getTemplateById(id);
    if (template && id !== "empty") {
      setTitle(t(template.titleKey));
      setDescription(t(template.descriptionKey));
    } else {
      setTitle("");
      setDescription("");
    }
    setStep("form");
    setError("");
  }

  function handleBackToChoose() {
    setStep("choose");
    setSelectedTemplateId(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const list = await wishlistApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate.trim() || null,
      });
      router.push(`/lists/${list.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("lists.failedCreate"));
    } finally {
      setLoading(false);
    }
  }

  if (step === "choose") {
    return (
      <div className="max-w-2xl">
        <Link
          href="/lists"
          className="text-sm text-surface-500 hover:text-brand-600 mb-4 inline-block"
        >
          {t("common.backToLists")}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{t("lists.newWishlist")}</CardTitle>
            <p className="text-sm text-surface-500 mt-1">{t("lists.chooseTemplate")}</p>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {LIST_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template.id)}
                className="flex flex-col items-start p-4 rounded-xl border-2 border-surface-200 hover:border-brand-400 hover:bg-brand-50/50 text-left transition-colors"
              >
                <span className="font-medium text-surface-900">{t(template.nameKey)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/lists"
        className="text-sm text-surface-500 hover:text-brand-600 mb-4 inline-block"
      >
        {t("common.backToLists")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("lists.newWishlist")}</CardTitle>
          {selectedTemplateId && selectedTemplateId !== "empty" && (
            <p className="text-sm text-surface-500 mt-1">
              {t("lists.fromTemplate")}: {t(getTemplateById(selectedTemplateId)!.nameKey)}
            </p>
          )}
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
            <span className="block text-sm font-medium text-surface-700 mb-1">
              {t("lists.descriptionOptional")}
            </span>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50/80 text-surface-900 placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lists.descriptionPlaceholder")}
              maxLength={2000}
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-surface-700 mb-1">
              {t("lists.dueDateOptional")}
            </span>
            <input
              type="date"
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50/80 text-surface-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" loading={loading}>
              {t("lists.createList")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackToChoose}
            >
              {t("lists.chooseTemplate")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
