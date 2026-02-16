# Product Review: Wishlist App

**Role:** Product Manager  
**Goal:** Identify UX gaps, edge cases, and improvements to make the app feel like a real product.

---

## 1. Weak UX Points

| Area | Issue |
|------|--------|
| **Home** | `/` always redirects to `/lists`; unauthenticated users see loading then redirect to login (confusing flash). |
| **Copy link** | No feedback when link is copied or when clipboard fails. |
| **Add item** | Errors (network, 403) are not shown; form stays open with no message. |
| **Loading** | Only spinners; no skeleton loaders. Feels abrupt. |
| **Delete item** | Native `confirm()` feels like a prototype; no consistent modal. |
| **Lists page** | No distinction between "Your lists" and "Shared with you". |
| **Public list** | "Go home" links to `/` which redirects again; unclear for anonymous users. |

---

## 2. Missing Edge Cases

| Case | Current behavior | Desired |
|------|------------------|--------|
| Network offline | Requests fail silently or generic error | Offline message + retry |
| List load failure | Redirect to `/lists` with no message | Error state + "Retry" |
| Add item failure | No message | Toast or inline error |
| Copy link failure (e.g. clipboard denied) | No feedback | Toast error |
| 401 / session expired | API returns 401, user may see generic error | Clear tokens, redirect to login, optional toast |
| Empty token on public URL | "Missing link token" | Friendlier copy + CTA |
| Viewer opens shared list | Can see list but no hint that they're view-only | Subtle "View only" or "Shared with you" |

---

## 3. Product Improvements

- **Landing for guests:** Home should show value prop + Sign up / Log in when not logged in; redirect to `/lists` when logged in.
- **Toasts:** Success (e.g. "Link copied") and error feedback (add item failed, copy failed) via a small toast/snackbar.
- **Skeletons:** Lists page and list detail use skeleton loaders instead of only a spinner.
- **Owned vs shared:** Lists page sections or badges: "Your lists" and "Shared with you".
- **Delete confirmation:** Custom modal with "Remove item?" and Cancel / Remove.
- **Public list CTA:** For anon users, "Create your own list" instead of vague "Go home".
- **Error recovery:** List detail load error shows message + Retry button instead of redirecting away.
- **401 handling:** Global API: on 401, clear tokens and redirect to login (or rely on AuthProvider refresh; if refresh fails, then redirect).

---

## 4. Empty State UX

| Screen | Current | Improvement |
|--------|---------|-------------|
| Lists (no lists) | "You don't have any lists yet" + button | Add short value line + icon/illustration. |
| List detail (no items) | "No items yet." + Add first item | Icon + one-line benefit + primary CTA. |
| Public list (no items) | "This list has no items yet." | Same: icon + friendly line. |
| New list | N/A (form) | Optional helper text under title. |

---

## 5. Error State UX

| Scenario | Current | Improvement |
|----------|---------|-------------|
| Login/register error | Red text under form | Keep; optionally add subtle border or icon. |
| List fetch error | Redirect to `/lists` | Error card: "Couldn't load this list" + Retry. |
| Add item error | None | Toast or inline under form. |
| Copy link error | None | Toast: "Couldn't copy. Try selecting the link." |
| 401 | Varies | Centralized: clear session, redirect to login, optional "Session expired" toast. |

---

## 6. Mobile UX Improvements

| Item | Suggestion |
|------|------------|
| Touch targets | Ensure buttons/links ≥ 44px; already reasonable. |
| Header | On small screens, "My lists" + user + Log out can wrap; consider order (e.g. logo, then nav, then user). |
| List detail actions | Buttons wrap; ensure "Add item" stays prominent. |
| Modal | Use full-width on very small screens (e.g. max-w-[calc(100%-2rem)]). |
| Safe area | Add `pb-safe` / padding for notched devices. |
| Pull to refresh | Optional: allow pull-to-refresh on list detail and lists page. |

---

## 7. Summary: High-Impact Changes

1. **Toast system** – Success and error feedback (copy, add item, generic).
2. **Home page** – Landing for guests; redirect to `/lists` when logged in.
3. **Empty states** – Icons + clearer copy + single primary CTA.
4. **Error states** – List load retry; add item and copy link errors visible (toast or inline).
5. **Delete confirmation** – Modal instead of `confirm()`.
6. **Lists page** – Skeletons; optional "Shared with you" section.
7. **Public list** – Friendlier error + "Create your own list" CTA.
8. **401 handling** – Clear session and redirect to login on 401 where appropriate.

---

## 8. Implemented (Summary)

- **Toast system** – `ToastProvider` + `useToast()`; success/error toasts for copy link, add item, auto-dismiss.
- **Home** – Landing for guests (value prop + Sign up / Log in); redirect to `/lists` when logged in.
- **Empty states** – `EmptyState` component with icon, title, description, CTA; used on lists, list detail items, public list, error screens.
- **Error states** – List load shows "Something went wrong" + Retry; auth errors in bordered box; 401 clears tokens.
- **Delete confirmation** – `ConfirmModal` in ItemCard instead of `confirm()`.
- **Lists page** – Skeleton loaders; "Your lists" / "Shared with you" sections; shared badge on list cards.
- **Public list** – Friendly error copy + "Create your own list" CTA; empty items state with icon.
- **Mobile** – `pb-safe` for notch/safe area; modal overflow-y-auto.
- **Auth** – "← Home" link on login/register; error message in red box.
- **New list** – "← Back to lists" link.
