"use client";

import { useEffect, useState } from "react";
import { wishlistApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";

export default function DeleteListModal({
  listId,
  listTitle,
  onConfirm,
  onCancel,
}: {
  listId: string;
  listTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [impact, setImpact] = useState<{ shared_with_count: number; contributors_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    wishlistApi
      .getDeleteImpact(listId)
      .then(setImpact)
      .catch(() => setImpact({ shared_with_count: 0, contributors_count: 0 }))
      .finally(() => setLoading(false));
  }, [listId]);

  async function handleConfirm() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await wishlistApi.delete(listId);
      onConfirm();
    } catch {
      setDeleteError(t("errors.deleteListFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const hasImpact = impact && (impact.shared_with_count > 0 || impact.contributors_count > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-surface-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-surface-900">{t("lists.deleteConfirmTitle")}</h3>
        <p className="mt-2 text-surface-600">
          {t("lists.deleteConfirmDesc", { title: listTitle })}
        </p>
        {loading ? (
          <p className="mt-3 text-sm text-surface-500">{t("lists.loading")}</p>
        ) : hasImpact && impact ? (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {t("lists.deleteImpact", {
              sharedCount: String(impact.shared_with_count),
              contributorsCount: String(impact.contributors_count),
            })}
          </div>
        ) : null}
        {deleteError && (
          <p className="mt-3 text-sm text-red-600">{deleteError}</p>
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={deleting} className="bg-red-600 hover:bg-red-700">
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
