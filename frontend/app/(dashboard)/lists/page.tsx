"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { wishlistApi } from "@/lib/api";
import type { WishlistWithProgress } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { ListCardSkeleton } from "@/components/ui/Skeleton";
import ListCard from "@/components/wishlist/ListCard";
import SortableListCard from "@/components/wishlist/SortableListCard";
import DeleteListModal from "@/components/wishlist/DeleteListModal";

export default function ListsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [lists, setLists] = useState<WishlistWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    wishlistApi
      .list()
      .then((data) => {
        if (!cancelled) setLists(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const owned = user ? lists.filter((l) => l.owner_id === user.id) : [];
  const shared = user ? lists.filter((l) => l.owner_id !== user.id) : [];
  const showSections = shared.length > 0;

  const totalLists = lists.length;
  const ownedCount = owned.length;
  const sharedCount = shared.length;
  const { itemsTotal, itemsPurchased } = lists.reduce(
    (acc, l) => {
      const items = l.items_count ?? 0;
      const purchased = l.purchased_count ?? 0;
      acc.itemsTotal += items;
      acc.itemsPurchased += purchased;
      return acc;
    },
    { itemsTotal: 0, itemsPurchased: 0 }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = owned.findIndex((l) => l.id === active.id);
    const newIndex = owned.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(owned, oldIndex, newIndex);
    const order = reordered.map((l, i) => ({ id: l.id, sort_order: i }));
    // Optimistic update: show new order immediately
    const newLists = showSections ? [...reordered, ...shared] : reordered;
    setLists(newLists);
    setReorderLoading(true);
    try {
      const updated = await wishlistApi.reorder(order);
      setLists(updated);
    } catch {
      // Revert: refetch from server
      wishlistApi.list().then(setLists);
    } finally {
      setReorderLoading(false);
    }
  }

  function handleDeleteConfirm() {
    if (deleteModalId) {
      setLists((prev) => prev.filter((l) => l.id !== deleteModalId));
      setDeleteModalId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-40 rounded-lg bg-surface-200 animate-pulse" />
          <div className="h-10 w-28 rounded-xl bg-surface-200 animate-pulse" />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <ListCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh]">
      <div className="flex flex-col gap-4 mb-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100 theme-transition">{t("lists.myLists")}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 theme-transition">{t("lists.subtitle")}</p>
          </div>
          <Link href="/lists/new" className="shrink-0">
            <Button className="shadow-soft hover:shadow-card-hover">
              <span className="mr-1.5">＋</span>
              {t("lists.newList")}
            </Button>
          </Link>
        </div>

        {totalLists > 0 && (
          <Card className="bg-gradient-to-r from-brand-50/80 via-amber-50/70 to-surface-50/80 dark:from-brand-950/40 dark:via-surface-800 dark:to-surface-800 border border-surface-100/60 dark:border-surface-600/60 shadow-sm theme-transition">
            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm text-surface-600 dark:text-surface-300 theme-transition">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-base">
                  🎁
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-surface-400 dark:text-surface-400 theme-transition">
                    {t("lists.statsOwned")}
                  </p>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 theme-transition">
                    {ownedCount}
                    {sharedCount > 0 && (
                      <span className="ml-1 text-xs font-normal text-surface-500 dark:text-surface-400 theme-transition">
                        · {t("lists.statsShared")}: {sharedCount}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="hidden sm:block h-9 w-px bg-surface-200/80" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-base">
                  📦
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-surface-400 dark:text-surface-400 theme-transition">
                    {t("lists.statsProgress")}
                  </p>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 tabular-nums theme-transition">
                    {itemsPurchased}/{itemsTotal}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
      {lists.length === 0 ? (
        <Card>
          <EmptyState
            icon="📋"
            title={t("lists.noListsYet")}
            description={t("lists.noListsDesc")}
            action={
              <Link href="/lists/new">
                <Button>{t("lists.createFirstList")}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8 relative z-10">
          {showSections && owned.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3 theme-transition">
                {t("lists.yourLists")}
                {reorderLoading && (
                  <span className="ml-2 text-xs text-surface-400 dark:text-surface-400 theme-transition">{t("lists.updatingOrder")}</span>
                )}
              </h2>
              <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
                <SortableContext items={owned.map((l) => l.id)} strategy={rectSortingStrategy}>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {owned.map((list) => (
                      <SortableListCard
                        key={list.id}
                        list={list}
                        isOwner
                        onDelete={(id) => setDeleteModalId(id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </section>
          )}
          {showSections && shared.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3 theme-transition">{t("lists.sharedWithYou")}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shared.map((list) => (
                  <li key={list.id}>
                    <ListCard list={list} showSharedBadge />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!showSections && (
            <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
              <SortableContext items={owned.map((l) => l.id)} strategy={rectSortingStrategy}>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {owned.map((list) => (
                    <SortableListCard
                      key={list.id}
                      list={list}
                      isOwner
                      onDelete={(id) => setDeleteModalId(id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
      {deleteModalId && (
        <DeleteListModal
          listId={deleteModalId}
          listTitle={lists.find((l) => l.id === deleteModalId)?.title ?? ""}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModalId(null)}
        />
      )}
    </div>
  );
}
