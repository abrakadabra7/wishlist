# Wishlist Frontend

Next.js 14 (App Router) frontend for the real-time social wishlist app.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React 18**

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # optional: set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default API base is `http://localhost:8000`.

## Env

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket base (defaults to API URL with `ws://`) |

## Structure

- `app/` – Routes: `(auth)/login`, `(auth)/register`, `(dashboard)/lists`, `(dashboard)/lists/[id]`, `public/list?token=`
- `components/ui/` – Button, Input, Card, Modal, Progress
- `components/layout/` – Header
- `components/wishlist/` – ListCard, ItemCard, ItemForm, ReservationChip, ContributionModal
- `contexts/` – AuthContext
- `hooks/` – useRealtimeList (WebSocket)
- `lib/` – api, auth, constants, websocket
- `types/` – Shared TypeScript types

## Features

- **Auth:** Login, register, JWT in localStorage, redirect with `?next=`
- **Dashboard:** List wishlists, create list, open list detail
- **List detail:** Add/edit/remove items, reserve / mark purchased, progress bar, contributions modal, copy public link, real-time updates via WebSocket
- **Public list:** View list by token (no login), progress bar, real-time updates
