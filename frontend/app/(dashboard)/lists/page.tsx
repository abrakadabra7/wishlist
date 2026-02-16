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
import FloatingGifts from "@/components/ui/FloatingGifts";

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
      {lists.length > 0 && <FloatingGifts />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 relative z-10">
        <h1 className="text-2xl font-semibold text-surface-900">{t("lists.myLists")}</h1>
        <Link href="/lists/new">
          <Button>{t("lists.newList")}</Button>
        </Link>
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
              <h2 className="text-sm font-medium text-surface-500 mb-3">
                {t("lists.yourLists")}
                {reorderLoading && (
                  <span className="ml-2 text-xs text-surface-400">{t("lists.updatingOrder")}</span>
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
              <h2 className="text-sm font-medium text-surface-500 mb-3">{t("lists.sharedWithYou")}</h2>
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
