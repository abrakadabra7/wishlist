"use client";

import { useState, useEffect } from "react";
import type { WishlistItem as Item } from "@/types";
import { itemApi, publicItemApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ReservationChip from "./ReservationChip";
import Progress from "@/components/ui/Progress";
import PayContributionModal from "./PayContributionModal";

function isReservationConflict(e: unknown): e is Error & { code: string; current_item?: Item } {
  return e instanceof Error && "code" in e && (e as { code: string }).code === "reservation_conflict";
}

export default function ItemCard({
  item,
  wishlistId,
  canEdit,
  isOwner,
  onUpdate,
  onRemove,
  publicToken,
}: {
  item: Item;
  wishlistId: string;
  canEdit: boolean;
  isOwner: boolean;
  onUpdate: (item: Item) => void;
  onRemove: (itemId: string) => void;
  /** When set, use public link API for reserve/contribute (no delete). */
  publicToken?: string | null;
}) {
  const [reserving, setReserving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [chipInAmount, setChipInAmount] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!conflictMessage) return;
    const t = setTimeout(() => setConflictMessage(null), 5000);
    return () => clearTimeout(t);
  }, [conflictMessage]);

  async function handleReserve(status: "reserved" | "purchased" | "available") {
    if (!canEdit) return;
    setConflictMessage(null);
    const previous = { ...item };
    if (status !== "available") {
      onUpdate({
        ...item,
        reservation_status: status,
        reserved_at: new Date().toISOString(),
        reserved_by_id: item.reserved_by_id,
      });
    }
    setReserving(true);
    try {
      const updated = publicToken
        ? await publicItemApi.updateItem(publicToken, item.id, { reservation_status: status })
        : await itemApi.update(wishlistId, item.id, { reservation_status: status });
      onUpdate(updated);
    } catch (e) {
      if (isReservationConflict(e)) {
        if (e.current_item) onUpdate(e.current_item);
        setConflictMessage(e.message);
      } else {
        onUpdate(previous);
        setConflictMessage(e instanceof Error ? e.message : t("common.somethingWrong"));
      }
    } finally {
      setReserving(false);
    }
  }

  function handleDeleteClick() {
    if (!canEdit || publicToken) return;
    setDeleteConfirmOpen(true);
  }
  const canDelete = canEdit && !publicToken;

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await itemApi.delete(wishlistId, item.id);
      onRemove(item.id);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const isAvailable = item.reservation_status === "available";
  const priceNum = typeof item.price === "number" ? item.price : Number(item.price);
  const hasPrice = !Number.isNaN(priceNum) && priceNum > 0;
  const total = Number(item.contributed_total) || 0;
  const pledged = Number(item.contributed_pledged) || 0;
  const paid = Number(item.contributed_paid) || 0;
  const progressPct = hasPrice ? Math.min(100, (total / priceNum) * 100) : 0;

  async function handleChipIn(status: "pledged" | "paid" = "pledged") {
    const amount = parseFloat(chipInAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setContributing(true);
    try {
      const updated = publicToken
        ? await publicItemApi.addContribution(publicToken, item.id, amount, status)
        : await itemApi.addContribution(wishlistId, item.id, amount, status);
      onUpdate(updated);
      setChipInAmount("");
      if (status !== "paid") setPayModalOpen(false);
    } catch {
      // toast or inline error
    } finally {
      setContributing(false);
    }
  }

  function openPayModal() {
    const amount = parseFloat(chipInAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setPayModalOpen(true);
  }

  return (
    <Card padding="md" className="flex flex-col gap-3">
      {conflictMessage && (
        <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          {conflictMessage}
        </p>
      )}
      <div className="flex gap-3">
        {item.image_url && (
          <a
            href={item.link_url || item.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface-100"
          >
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </a>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-surface-900 dark:text-surface-100 break-words theme-transition">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400 theme-transition">{item.description}</p>
              )}
              {item.link_url && (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline truncate max-w-full theme-transition"
                >
                  {item.link_url}
                </a>
              )}
              {hasPrice && (
                <p className="mt-1 text-sm text-surface-600 dark:text-surface-300 theme-transition">
                  {priceNum.toFixed(2)}
                  {item.currency && <span className="text-surface-500 dark:text-surface-400"> {item.currency}</span>}
                  {(pledged > 0 || paid > 0) && (
                    <span className="text-surface-500 dark:text-surface-400">
                      {" "}
                      {pledged > 0 && (
                        <>
                          {t("items.pledged")}: {pledged.toFixed(2)}
                          {item.currency ? ` ${item.currency}` : ""}
                        </>
                      )}
                      {pledged > 0 && paid > 0 && " · "}
                      {paid > 0 && (
                        <>
                          {t("items.paid")}: {paid.toFixed(2)}
                          {item.currency ? ` ${item.currency}` : ""}
                        </>
                      )}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ReservationChip status={item.reservation_status} />
              {item.contributed_by_id && (
                <span className="text-xs text-surface-400 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full theme-transition">
                  {t("items.gift")}
                </span>
              )}
            </div>
          </div>
          {hasPrice && (
            <div className="mt-2">
              <Progress
                value={total}
                max={priceNum}
                paid={paid}
                pledged={pledged}
                paidLabel={t("items.paid")}
                pledgedLabel={t("items.pledged")}
                label={t("items.collected")}
                showCount
              />
            </div>
          )}
          {!isOwner && hasPrice && item.reservation_status === "available" && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={t("items.amount")}
                  value={chipInAmount}
                  onChange={(e) => setChipInAmount(e.target.value)}
                  className="w-24 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-1.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 theme-transition"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  loading={contributing}
                  onClick={() => handleChipIn("pledged")}
                  disabled={!chipInAmount || parseFloat(chipInAmount) <= 0}
                >
                  {t("items.promiseOnly")}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={openPayModal}
                  disabled={!chipInAmount || parseFloat(chipInAmount) <= 0}
                >
                  {t("items.payNow")}
                </Button>
              </div>
              <PayContributionModal
                open={payModalOpen}
                onClose={() => setPayModalOpen(false)}
                amount={parseFloat(chipInAmount) || 0}
                currency={item.currency ?? null}
                onPay={() => handleChipIn("paid")}
                loading={contributing}
              />
            </div>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-surface-100 dark:border-surface-700 theme-transition">
          {isAvailable && (
            <>
              <Button
                size="sm"
                variant="secondary"
                loading={reserving}
                onClick={() => handleReserve("reserved")}
              >
                {t("items.illGetThis")}
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={reserving}
                onClick={() => handleReserve("purchased")}
              >
                {t("items.markPurchased")}
              </Button>
            </>
          )}
          {item.reservation_status === "reserved" && (
            <Button
              size="sm"
              variant="primary"
              loading={reserving}
              onClick={() => handleReserve("purchased")}
            >
              {t("items.markPurchased")}
            </Button>
          )}
          {(item.reservation_status === "reserved" ||
            item.reservation_status === "purchased") && (
            <Button
              size="sm"
              variant="ghost"
              loading={reserving}
              onClick={() => handleReserve("available")}
            >
              {t("items.unreserve")}
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              loading={deleting}
              onClick={handleDeleteClick}
              className="ml-auto text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 theme-transition"
            >
              {t("common.remove")}
            </Button>
          )}
        </div>
      )}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t("items.removeItem")}
        description={t("items.removeItemDesc", { title: item.title })}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={deleting}
      />
    </Card>
  );
}
