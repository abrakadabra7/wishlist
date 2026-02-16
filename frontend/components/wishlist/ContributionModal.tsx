"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { WishlistItem } from "@/types";
import Modal from "@/components/ui/Modal";

export default function ContributionModal({
  open,
  onClose,
  items,
  listTitle,
}: {
  open: boolean;
  onClose: () => void;
  items: WishlistItem[];
  listTitle: string;
}) {
  const { t } = useLanguage();
  const contributed = items.filter((i) => i.contributed_by_id != null);
  const reserved = items.filter((i) => i.reservation_status === "reserved");
  const purchased = items.filter((i) => i.reservation_status === "purchased");

  return (
    <Modal open={open} onClose={onClose} title={t("contributions.title")} size="lg">
      <p className="text-sm text-surface-500 mb-4">
        {t("contributions.summaryFor", { title: listTitle })}
      </p>
      <div className="space-y-4">
        <section>
          <h3 className="text-sm font-medium text-surface-700 mb-2">
            {t("contributions.giftedByOthers")}
          </h3>
          {contributed.length === 0 ? (
            <p className="text-sm text-surface-500">{t("contributions.noGiftedYet")}</p>
          ) : (
            <ul className="space-y-1.5">
              {contributed.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-surface-50"
                >
                  <span className="font-medium text-surface-800">{item.title}</span>
                  <span className="text-surface-500 capitalize">
                    {item.reservation_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-sm font-medium text-surface-700 mb-2">
            {t("contributions.reservedCount", { count: reserved.length })}
          </h3>
          {reserved.length === 0 ? (
            <p className="text-sm text-surface-500">{t("contributions.noReserved")}</p>
          ) : (
            <ul className="space-y-1.5">
              {reserved.map((item) => (
                <li
                  key={item.id}
                  className="text-sm py-1.5 px-3 rounded-lg bg-amber-50 text-amber-900"
                >
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-sm font-medium text-surface-700 mb-2">
            {t("contributions.purchasedCount", { count: purchased.length })}
          </h3>
          {purchased.length === 0 ? (
            <p className="text-sm text-surface-500">{t("contributions.noPurchasedYet")}</p>
          ) : (
            <ul className="space-y-1.5">
              {purchased.map((item) => (
                <li
                  key={item.id}
                  className="text-sm py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-900"
                >
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
