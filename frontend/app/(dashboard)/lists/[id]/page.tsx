"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { wishlistApi, itemApi, publicLinkApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Wishlist, WishlistItem, WishlistSuggestion } from "@/types";
import { useRealtimeList } from "@/hooks/useRealtimeList";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import EmptyState from "@/components/ui/EmptyState";
import { ListDetailSkeleton } from "@/components/ui/Skeleton";
import ItemCard from "@/components/wishlist/ItemCard";
import ItemForm from "@/components/wishlist/ItemForm";
import ContributionModal from "@/components/wishlist/ContributionModal";

export default function ListDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;
  const toast = useToast();
  const { t } = useLanguage();
  const [list, setList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showContribution, setShowContribution] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<WishlistSuggestion[]>([]);
  const [suggestionActionId, setSuggestionActionId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    Promise.all([wishlistApi.get(id), itemApi.list(id)])
      .then(([listData, itemsData]) => {
        setList(listData);
        setItems(itemsData);
      })
      .catch(() => {
        setList(null);
        setItems([]);
        setLoadError(t("listDetail.loadError"));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!id || !list || list.owner_id !== user?.id) return;
    wishlistApi.listSuggestions(id).then(setSuggestions).catch(() => setSuggestions([]));
  }, [id, list, user?.id]);

  const isOwner = user && list && list.owner_id === user.id;
  const canEdit = !!user && !!list;

  const refetchSuggestions = useCallback(() => {
    if (!id) return;
    wishlistApi.listSuggestions(id).then(setSuggestions).catch(() => setSuggestions([]));
  }, [id]);

  const handleSuggestionAdded = useCallback(() => {
    refetchSuggestions();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications-refresh"));
    }
  }, [refetchSuggestions]);

  const { connected, reconnecting } = useRealtimeList(id, items, setItems, {
    onSuggestionAdded: isOwner ? handleSuggestionAdded : undefined,
    onSuggestionRemoved: isOwner
      ? (suggestionId) =>
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      : undefined,
  });

  async function handleAcceptSuggestion(suggestionId: string) {
    setSuggestionActionId(suggestionId);
    try {
      await wishlistApi.acceptSuggestion(id, suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      const itemsData = await itemApi.list(id);
      setItems(itemsData);
      toast.addToast("success", t("listDetail.suggestionAdded"));
    } catch {
      toast.addToast("error", t("listDetail.addSuggestionFailed"));
    } finally {
      setSuggestionActionId(null);
    }
  }

  async function handleRejectSuggestion(suggestionId: string) {
    setSuggestionActionId(suggestionId);
    try {
      await wishlistApi.rejectSuggestion(id, suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      toast.addToast("success", t("listDetail.suggestionRejected"));
    } catch {
      toast.addToast("error", t("listDetail.rejectSuggestionFailed"));
    } finally {
      setSuggestionActionId(null);
    }
  }

  async function handleAddItem(data: {
    title: string;
    description: string;
    link_url: string;
    image_url?: string;
    price?: number;
    currency?: string;
  }) {
    setAddLoading(true);
    try {
      await itemApi.create(id, {
        title: data.title,
        description: data.description || undefined,
        link_url: data.link_url || undefined,
        image_url: data.image_url || undefined,
        price: data.price,
        currency: data.currency,
      });
      const freshList = await itemApi.list(id);
      setItems(freshList);
      setShowAddForm(false);
      toast.addToast("success", t("listDetail.itemAdded"));
    } catch (e) {
      toast.addToast("error", e instanceof Error ? e.message : t("listDetail.addItemFailed"));
    } finally {
      setAddLoading(false);
    }
  }

  async function handleCopyPublicLink() {
    if (!list) return;
    setLinkLoading(true);
    try {
      let link = publicLink;
      if (!link) {
        const pl = await publicLinkApi.create(id);
        link = pl.token;
        setPublicLink(pl.token);
      }
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/public/list?token=${link}`;
      await navigator.clipboard.writeText(url);
      toast.addToast("success", t("listDetail.linkCopied"));
    } catch {
      toast.addToast("error", t("listDetail.copyLinkFailed"));
    } finally {
      setLinkLoading(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Link href="/lists" className="text-sm text-surface-500 hover:text-brand-600 inline-block">
          {t("common.backToLists")}
        </Link>
        <Card className="py-10 text-center">
          <EmptyState
            icon="⚠️"
            title={t("common.somethingWrong")}
            description={loadError}
            action={
              <Button variant="secondary" onClick={fetchData}>
                {t("common.tryAgain")}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (loading || !list) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 rounded-lg bg-surface-200 animate-pulse" />
        <ListDetailSkeleton />
      </div>
    );
  }

  const purchasedCount = items.filter((i) => i.reservation_status === "purchased").length;
  const totalCount = items.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/lists"
            className="text-sm text-surface-500 hover:text-brand-600 mb-1 inline-block"
          >
            {t("common.backToLists")}
          </Link>
          <h1 className="text-2xl font-semibold text-surface-900">{list.title}</h1>
          {list.description && (
            <p className="mt-1 text-surface-500">{list.description}</p>
          )}
          {(connected || reconnecting) && (
            <span className={`inline-flex items-center gap-1.5 mt-2 text-xs ${reconnecting ? "text-amber-600" : "text-emerald-600"}`}>
              <span className={`w-2 h-2 rounded-full ${reconnecting ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              {reconnecting ? t("common.reconnecting") : t("common.live")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <>
              <Link href={`/lists/${id}/edit`}>
                <Button variant="ghost" size="sm">
                  {t("listDetail.editList")}
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowContribution(true)}
              >
                {t("listDetail.contributions")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={linkLoading}
                onClick={handleCopyPublicLink}
              >
                {t("listDetail.copyPublicLink")}
              </Button>
            </>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              {t("listDetail.addItem")}
            </Button>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <Card padding="md">
          <Progress
            value={purchasedCount}
            max={totalCount}
            label={t("listDetail.progress")}
            showCount
          />
        </Card>
      )}

      {showAddForm && (
        <ItemForm
          onSubmit={handleAddItem}
          onCancel={() => setShowAddForm(false)}
          loading={addLoading}
        />
      )}

      {isOwner && suggestions.length > 0 && (
        <Card padding="md">
          <h2 className="text-lg font-medium text-surface-800 mb-2">{t("listDetail.suggestionsFromVisitors")}</h2>
          <p className="text-sm text-surface-500 mb-3">{t("listDetail.suggestionsHint")}</p>
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-xl bg-surface-50 border border-surface-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-surface-900">{s.title}</p>
                  {s.link_url && (
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-600 hover:underline truncate block"
                    >
                      {s.link_url}
                    </a>
                  )}
                  {s.message && <p className="text-sm text-surface-500 mt-1">{s.message}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={suggestionActionId === s.id}
                    onClick={() => handleAcceptSuggestion(s.id)}
                  >
                    {t("common.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={suggestionActionId === s.id}
                    onClick={() => handleRejectSuggestion(s.id)}
                    className="text-surface-500 hover:text-red-600"
                  >
                    {t("common.reject")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-surface-800">{t("listDetail.items")}</h2>
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon="🎁"
              title={t("listDetail.noItemsYet")}
              description={t("listDetail.noItemsDesc")}
              action={
                canEdit ? (
                  <Button onClick={() => setShowAddForm(true)}>{t("listDetail.addFirstItem")}</Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  wishlistId={id}
                  canEdit={canEdit}
                  isOwner={!!isOwner}
                  onUpdate={(updated) =>
                    setItems((prev) =>
                      prev.map((i) => (i.id === updated.id ? updated : i))
                    )
                  }
                  onRemove={(itemId) =>
                    setItems((prev) => prev.filter((i) => i.id !== itemId))
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ContributionModal
        open={showContribution}
        onClose={() => setShowContribution(false)}
        items={items}
        listTitle={list.title}
      />
    </div>
  );
}
