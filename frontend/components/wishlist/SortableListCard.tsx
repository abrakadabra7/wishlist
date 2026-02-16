"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WishlistWithProgress } from "@/types";
import ListCard from "./ListCard";

export default function SortableListCard({
  list,
  isOwner = false,
  onDelete,
}: {
  list: WishlistWithProgress;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={`relative ${isDragging ? "opacity-60 z-10" : ""}`}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-[1] p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.preventDefault()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </div>
      <div className="pl-9">
        <ListCard list={list} isOwner={isOwner} onDelete={onDelete} />
      </div>
    </li>
  );
}
