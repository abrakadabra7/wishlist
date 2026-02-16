"use client";

import { useState, useId } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 2) {
    return digits.slice(0, 2) + "/" + digits.slice(2);
  }
  return digits;
}

export default function PayContributionModal({
  open,
  onClose,
  amount,
  currency,
  onPay,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
  currency: string | null;
  onPay: () => Promise<void>;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const cardId = useId();
  const expiryId = useId();
  const cvvId = useId();
  const cardholderId = useId();

  const cardDigits = cardNumber.replace(/\D/g, "").length;
  const expiryDigits = expiry.replace(/\D/g, "").length;
  const valid =
    cardDigits >= 13 &&
    expiryDigits === 4 &&
    cvv.length >= 3 &&
    cvv.length <= 4 &&
    cardholder.trim().length >= 2;

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(e.target.value));
  }

  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExpiry(formatExpiry(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    try {
      await onPay();
      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch {
      // parent may show error
    }
  }

  function handleClose() {
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setCardholder("");
    setShowSuccess(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={showSuccess ? "" : t("items.payWithCard")} size="lg">
      {showSuccess ? (
        <div className="py-8 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-scale-in">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-emerald-700">{t("items.paid")}!</p>
          <p className="text-sm text-surface-500">{t("items.paySuccessShort")}</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-surface-600">
          {t("items.amount")}:{" "}
          <strong>
            {amount.toFixed(2)}
            {currency ? ` ${currency}` : ""}
          </strong>
        </p>
        <p className="text-xs text-surface-500 rounded-lg bg-surface-100 px-3 py-2">
          {t("items.payDemoNote")}
        </p>
        <div className="grid gap-3">
          <div>
            <label htmlFor={cardholderId} className="block text-sm font-medium text-surface-700 mb-1">
              {t("items.cardholder")}
            </label>
            <input
              id={cardholderId}
              type="text"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              placeholder="IVAN IVANOV"
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              maxLength={32}
            />
          </div>
          <div>
            <label htmlFor={cardId} className="block text-sm font-medium text-surface-700 mb-1">
              {t("items.cardNumber")}
            </label>
            <input
              id={cardId}
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="0000 0000 0000 0000"
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono tracking-wider placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              maxLength={19}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={expiryId} className="block text-sm font-medium text-surface-700 mb-1">
                {t("items.expiry")}
              </label>
              <input
                id={expiryId}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                maxLength={5}
              />
            </div>
            <div>
              <label htmlFor={cvvId} className="block text-sm font-medium text-surface-700 mb-1">
                {t("items.cvv")}
              </label>
              <input
                id={cvvId}
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                maxLength={4}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!valid} loading={loading}>
            {t("items.payNow")}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
