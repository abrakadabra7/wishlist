"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { publicLinkApi, publicSuggestionApi } from "@/lib/api";
import type { Wishlist, WishlistItem } from "@/types";
import { useRealtimeList } from "@/hooks/useRealtimeList";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ReservationChip from "@/components/wishlist/ReservationChip";
import ItemCard from "@/components/wishlist/ItemCard";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";

function PublicListContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [data, setData] = useState<{ wishlist: Wishlist; items: WishlistItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestLink, setSuggestLink] = useState("");
  const [suggestMessage, setSuggestMessage] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("missing");
      setLoading(false);
      return;
    }
    publicLinkApi
      .getByToken(token)
      .then((res) => {
        setData({ wishlist: res.wishlist, items: res.items });
        setItems(res.items);
      })
      .catch(() => setError("invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  const { connected, reconnecting } = useRealtimeList(
    data?.wishlist?.id ?? null,
    items,
    setItems,
    { usePublicToken: token }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    const isInvalid = error === "invalid";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface-50">
        <Card className="max-w-md w-full py-10">
          <EmptyState
            icon="🔗"
            title={isInvalid ? t("publicList.invalidLink") : t("publicList.missingLink")}
            description={isInvalid ? t("publicList.invalidLinkDesc") : t("publicList.missingLinkDesc")}
            action={
              <Link href="/">
                <Button>{t("publicList.createYourOwn")}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const { wishlist } = data;
  const purchasedCount = items.filter((i) => i.reservation_status === "purchased").length;
  const isOwner = user && wishlist.owner_id === user.id;

  async function handleSuggestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !suggestTitle.trim()) return;
    setSuggestError(null);
    setSuggestLoading(true);
    try {
      await publicSuggestionApi.create(
        token,
        {
          title: suggestTitle.trim(),
          link_url: suggestLink.trim() || null,
          message: suggestMessage.trim() || null,
        },
        user ? undefined : null
      );
      setSuggestSent(true);
      setSuggestTitle("");
      setSuggestLink("");
      setSuggestMessage("");
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : t("publicList.failedSendSuggestion"));
    } finally {
      setSuggestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-surface-500">{t("publicList.sharedWishlist")}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-surface-200 bg-surface-50/80 p-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                    locale === "en" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("ru")}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors sm:px-2.5 sm:py-1 ${
                    locale === "ru" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  RU
                </button>
              </div>
              {!user ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/public/list?token=${token}`)}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {t("publicList.logInToReserve")}
                </Link>
              ) : (
                <>
                  <Link href="/lists" className="text-sm text-surface-500 hover:text-brand-600">
                    {t("publicList.myLists")}
                  </Link>
                  <NotificationsDropdown />
                </>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-surface-900 mt-1">
            {wishlist.title}
          </h1>
          {(connected || reconnecting) && (
            <span className={`inline-flex items-center gap-1.5 mt-2 text-xs ${reconnecting ? "text-amber-600" : "text-emerald-600"}`}>
              <span className={`w-2 h-2 rounded-full ${reconnecting ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              {reconnecting ? t("common.reconnecting") : t("common.live")}
            </span>
          )}
          {wishlist.description && (
            <p className="mt-1 text-surface-500">{wishlist.description}</p>
          )}
          {user && (
            <p className="mt-2 text-sm text-brand-600">
              {t("publicList.youCanReserve")}
            </p>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {items.length > 0 && (
          <Card className="mb-6" padding="md">
            <Progress
              value={purchasedCount}
              max={items.length}
              label={t("publicList.progress")}
              showCount
            />
          </Card>
        )}
        <ul className="space-y-3">
          {user && token
            ? items.map((item) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    wishlistId={wishlist.id}
                    canEdit
                    isOwner={false}
                    publicToken={token}
                    onUpdate={(updated) =>
                      setItems((prev) =>
                        prev.map((i) => (i.id === updated.id ? updated : i))
                      )
                    }
                    onRemove={() => {}}
                  />
                </li>
              ))
            : items.map((item) => {
                const priceNum = typeof item.price === "number" ? item.price : Number(item.price);
                const hasPrice = !Number.isNaN(priceNum) && priceNum > 0;
                const total = Number(item.contributed_total) || 0;
                const pledged = Number(item.contributed_pledged) || 0;
                const paid = Number(item.contributed_paid) || 0;
                return (
                  <li key={item.id}>
                    <Card padding="md">
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
                              <h3 className="font-medium text-surface-900">{item.title}</h3>
                              {item.description && (
                                <p className="mt-1 text-sm text-surface-500">
                                  {item.description}
                                </p>
                              )}
                              {item.link_url && (
                                <a
                                  href={item.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-block text-sm text-brand-600 hover:underline truncate max-w-full"
                                >
                                  {item.link_url}
                                </a>
                              )}
                              {hasPrice && (
                                <p className="mt-1 text-sm text-surface-600">
                                  {priceNum.toFixed(2)}
                                  {item.currency && <span className="text-surface-500"> {item.currency}</span>}
                                  {total > 0 && (
                                    <span className="text-surface-500">
                                      {" "}
                                      {item.currency
                                        ? t("items.collectedAmountWithCurrency", {
                                            amount: total.toFixed(2),
                                            currency: item.currency,
                                          })
                                        : t("items.collectedAmount", { amount: total.toFixed(2) })}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <ReservationChip status={item.reservation_status} />
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
                                label={t("publicList.collected")}
                                showCount
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
        </ul>
        {items.length === 0 && (
          <Card>
            <EmptyState
              icon="🎁"
              title={t("publicList.noItemsYet")}
              description={t("publicList.noItemsDescOwner")}
            />
          </Card>
        )}

        {!isOwner && token && (
          <Card className="mt-6" padding="md">
            <h2 className="text-lg font-medium text-surface-900 mb-1">{t("publicList.suggestItem")}</h2>
            <p className="text-sm text-surface-500 mb-3">
              {t("publicList.suggestHint")}
            </p>
            {suggestSent ? (
              <p className="text-sm text-emerald-600">{t("publicList.suggestionSent")}</p>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={t("publicList.itemName")}
                  value={suggestTitle}
                  onChange={(e) => setSuggestTitle(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <input
                  type="url"
                  placeholder={t("publicList.linkOptional")}
                  value={suggestLink}
                  onChange={(e) => setSuggestLink(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <textarea
                  placeholder={t("publicList.messageOptional")}
                  rows={2}
                  value={suggestMessage}
                  onChange={(e) => setSuggestMessage(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
                />
                {suggestError && <p className="text-sm text-red-600">{suggestError}</p>}
                <Button type="submit" loading={suggestLoading} size="sm">
                  {t("publicList.sendSuggestion")}
                </Button>
              </form>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

export default function PublicListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PublicListContent />
    </Suspense>
  );
}
