# Sosyal Wishlist Uygulaması — Sistem Mimarisi

**Versiyon:** 1.0  
**Tarih:** Şubat 2025  
**Rol:** Senior Full-Stack Architect

---

## 1. Sistem Mimarisi (Genel Bakış)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Next.js App Router (React)                                             │  │
│  │  - SSR/SSG + Client Components                                          │  │
│  │  - JWT (httpOnly cookie veya memory) + Public link token (query/state)   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                    │
         │ HTTPS (REST)                       │ WSS (WebSocket)
         ▼                                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  Reverse Proxy / LB         │    │  Same or separate WSS entry  │
│  (e.g. Nginx / Traefik)     │    │  (e.g. /ws or subdomain)     │
└─────────────────────────────┘    └─────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  FastAPI (REST API)         │    │  FastAPI WebSocket endpoint  │
│  - Auth, CRUD, public links │    │  - Rooms per list/friend     │
│  - JWT validation           │    │  - Broadcast list updates    │
└─────────────────────────────┘    └─────────────────────────────┘
         │                                    │
         └──────────────┬─────────────────────┘
                        ▼
         ┌─────────────────────────────┐
         │  PostgreSQL                  │
         │  - Users, lists, items       │
         │  - Shares, public links      │
         └─────────────────────────────┘
```

- **Frontend:** Next.js (App Router), React Server Components + Client Components, REST client + WebSocket client.
- **Backend:** FastAPI; REST için route’lar, WebSocket için ayrı endpoint(ler).
- **Veritabanı:** PostgreSQL (tek kaynak; REST ve WebSocket aynı DB’yi kullanır).
- **Realtime katmanı:** FastAPI üzerinde WebSocket; oda (room) kavramı liste bazlı (liste ID veya public token ile subscribe).

**Public link (giriş yapmadan erişim):**  
Liste sahibi “paylaşılabilir link” oluşturur. Link, token ile korunur; token query’de veya path’te taşınır. Backend token ile listeyi resolve eder; WebSocket’e de aynı token ile “anon” bağlanılabilir.

---

## 2. Veritabanı Şeması ve İlişkiler

### 2.1 Varlık İlişki Özeti

- **users** — Hesap açan kullanıcılar.
- **wishlists** — Kullanıcıya ait listeler (isim, açıklama, public mi).
- **wishlist_items** — Listeye ait öğeler (ürün/link, not, sıra, satın alındı mı).
- **shares** — Listeyi başka kullanıcıya paylaşma (edit/view yetkisi).
- **public_links** — Giriş yapmadan erişim için tek seferlik veya süresiz token’lar.
- **activity / notifications** (opsiyonel) — Listede değişiklik, davet vb. için.

### 2.2 Tablolar

```text
users
  id                UUID PK
  email             VARCHAR UNIQUE NOT NULL
  password_hash     VARCHAR NOT NULL
  display_name      VARCHAR
  avatar_url        VARCHAR
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

wishlists
  id                UUID PK
  owner_id          UUID FK(users.id) ON DELETE CASCADE
  title             VARCHAR NOT NULL
  description       TEXT
  is_public         BOOLEAN DEFAULT false   -- public link ile paylaşım açık mı
  sort_order        INT DEFAULT 0
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

wishlist_items
  id                UUID PK
  wishlist_id       UUID FK(wishlists.id) ON DELETE CASCADE
  title             VARCHAR NOT NULL
  description       TEXT
  link_url          VARCHAR
  image_url         VARCHAR
  position          INT NOT NULL DEFAULT 0
  is_claimed        BOOLEAN DEFAULT false
  claimed_by_id     UUID FK(users.id) NULL
  claimed_at        TIMESTAMPTZ NULL
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

shares
  id                UUID PK
  wishlist_id       UUID FK(wishlists.id) ON DELETE CASCADE
  user_id           UUID FK(users.id) ON DELETE CASCADE
  role              VARCHAR NOT NULL   -- 'viewer' | 'editor'
  created_at        TIMESTAMPTZ
  UNIQUE(wishlist_id, user_id)

public_links
  id                UUID PK
  wishlist_id       UUID FK(wishlists.id) ON DELETE CASCADE
  token             VARCHAR UNIQUE NOT NULL   -- URL’de kullanılacak
  expires_at        TIMESTAMPTZ NULL          -- NULL = süresiz
  max_views         INT NULL                  -- NULL = sınırsız
  view_count        INT DEFAULT 0
  created_at        TIMESTAMPTZ
```

### 2.3 İlişkiler Özeti

- Bir **user** birden fazla **wishlist**’e owner.
- Bir **wishlist** birden fazla **wishlist_item** içerir.
- **shares** ile bir wishlist birden fazla **user**’a paylaşılır (viewer/editor).
- **public_links** ile bir wishlist’e giriş yapmadan token ile erişilir.
- **wishlist_items.claimed_by_id** ile öğe “ben aldım” diyen kullanıcıya bağlanır.

### 2.4 İndeksler (Öneri)

- `wishlists(owner_id)`, `wishlist_items(wishlist_id)`, `shares(wishlist_id)`, `shares(user_id)`
- `public_links(token)` UNIQUE zaten indeks
- `users(email)` UNIQUE

---

## 3. REST API Rotaları

Temel kural:  
- Auth gereken route’lar: `Authorization: Bearer <access_token>` veya cookie.  
- Public link ile erişim: `?token=<public_link_token>` veya header `X-Public-Link-Token`.

### 3.1 Auth

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST   | `/auth/register` | Kayıt (email, password, display_name) |
| POST   | `/auth/login`    | Giriş; response’ta JWT (veya set-cookie) |
| POST   | `/auth/refresh`  | Refresh token ile yeni access token |
| POST   | `/auth/logout`   | Çıkış (client tarafında token silme / blacklist opsiyonel) |

### 3.2 Kullanıcı

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET    | `/users/me` | Mevcut kullanıcı profili |
| PATCH  | `/users/me` | Profil güncelleme |

### 3.3 Wishlist’ler (giriş zorunlu, sahip veya paylaşım yetkisi)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET    | `/wishlists` | Kullanıcının listeleri + paylaşılan listeler |
| POST   | `/wishlists` | Yeni liste |
| GET    | `/wishlists/:id` | Liste detay (yetki kontrolü) |
| PATCH  | `/wishlists/:id` | Liste güncelleme |
| DELETE | `/wishlists/:id` | Liste silme |

### 3.4 Public link ile liste (giriş yok)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET    | `/public/wishlists` | Query: `?token=<token>` — Token’a ait listeyi döner (read-only meta + items) |

Tek endpoint yeterli: token geçerliyse listeyi döner, değilse 403/404.

### 3.5 Liste öğeleri (wishlist items)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET    | `/wishlists/:id/items` | Listedeki öğeler |
| POST   | `/wishlists/:id/items` | Öğe ekleme (owner veya editor) |
| GET    | `/wishlists/:id/items/:itemId` | Tek öğe |
| PATCH  | `/wishlists/:id/items/:itemId` | Öğe güncelleme / claim |
| DELETE | `/wishlists/:id/items/:itemId` | Öğe silme |

### 3.6 Paylaşım

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET    | `/wishlists/:id/shares` | Paylaşım listesi (owner) |
| POST   | `/wishlists/:id/shares` | Paylaşım ekle (email + role) |
| DELETE | `/wishlists/:id/shares/:userId` | Paylaşım kaldır |

### 3.7 Public link yönetimi (liste sahibi)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST   | `/wishlists/:id/public-link` | Yeni public link (body: expires_at, max_views opsiyonel) |
| GET    | `/wishlists/:id/public-link` | Mevcut link bilgisi (varsa) |
| DELETE | `/wishlists/:id/public-link` | Link iptal (token invalidate) |

### 3.8 Response biçimi (genel)

- Başarı: `200/201` + JSON body (tek kaynak veya liste).
- Hata: `4xx/5xx` + `{ "detail": "...", "code": "OPTIONAL" }`.
- Liste sayfalama: `GET ...?page=1&limit=20` ve response’ta `total`, `page`, `items`.

---

## 4. WebSocket Olay Yapısı

### 4.1 Bağlantı

- **URL:** `wss://api.example.com/ws` veya `wss://api.example.com/ws?token=...`
- **Kimlik doğrulama:**
  - Giriş yapmış: Query’de `access_token` veya ilk mesajda `auth` event’i ile JWT.
  - Public link: Query’de `public_token=<public_link_token>`.

Sunucu bağlantıyı kabul ettikten sonra bir “room”a subscribe eder:  
`list:<wishlist_id>` veya `public:<public_token>`.

### 4.2 Client → Server (gönderilen event’ler)

| Event | Payload | Açıklama |
|-------|---------|----------|
| `auth` | `{ "access_token": "..." }` | JWT ile kimlik doğrulama (query’de token yoksa) |
| `subscribe` | `{ "wishlist_id": "uuid" }` | Liste odasına abone ol (yetki kontrolü) |
| `subscribe_public` | `{ "public_token": "..." }` | Public token ile liste odasına abone |
| `unsubscribe` | `{ "wishlist_id": "uuid" }` | Odadan ayrıl |

### 4.3 Server → Client (yayınlanan event’ler)

Tüm event’ler aynı odadaki (aynı listeyi izleyen) diğer client’lara broadcast edilir.

| Event | Payload | Açıklama |
|-------|---------|----------|
| `subscribed` | `{ "wishlist_id": "uuid" }` | Abonelik onayı |
| `error` | `{ "code": "...", "message": "..." }` | Yetki/validation hatası |
| `item_added` | `{ "item": { ... } }` | Yeni öğe eklendi |
| `item_updated` | `{ "item": { ... } }` | Öğe güncellendi (claim dahil) |
| `item_removed` | `{ "item_id": "uuid" }` | Öğe silindi |
| `list_updated` | `{ "wishlist": { ... } }` | Liste meta bilgisi değişti |
| `list_deleted` | `{ "wishlist_id": "uuid" }` | Liste silindi (odadaki herkese) |

### 4.4 Örnek akış

1. Client WSS’e bağlanır, `auth` veya query’de token gönderir.
2. Client `subscribe` veya `subscribe_public` gönderir.
3. Server yetki/token kontrolü yapar, odaya ekler, `subscribed` döner.
4. Bir başka client aynı listeye öğe ekler → REST API çağrılır → Backend aynı listeyi dinleyen WebSocket odasına `item_added` broadcast eder.
5. Tüm aboneler güncel listeyi alır (gerekirse REST’ten tekrar çekebilir veya payload’daki item ile state günceller).

---

## 5. Kimlik Doğrulama Stratejisi

- **Mekanizma:** JWT (access + isteğe bağlı refresh).
- **Access token:** Kısa ömürlü (örn. 15 dk); REST ve WebSocket’te `Authorization: Bearer <token>` veya secure httpOnly cookie.
- **Refresh token:** Uzun ömürlü (örn. 7 gün), sadece `/auth/refresh` ile yeni access almak için; mümkünse httpOnly cookie, DB’de veya Redis’te saklanabilir (revoke için).
- **Public link:** Şifre yok; `public_links.token` ile liste read-only (veya tanımlanırsa sınırlı yazma) erişim. Token URL’de veya header’da.
- **Yetkilendirme:**
  - Liste: sadece owner veya `shares`’ta kayıtlı user (viewer/editor) erişebilir.
  - Public: sadece geçerli ve süresi/limit aşımamış token.
- **Password:** Kayıtta bcrypt/argon2 ile hash; asla düz metin saklanmaz.

---

## 6. Güvenlik Konuları

- **Rate limiting:** Login, register, public link görüntüleme ve genel API için (IP ve/veya user bazlı).
- **CORS:** Sadece bilinen frontend origin’leri; production’da wildcard yok.
- **Input validation:** Tüm body/query/param’lar validate (Pydantic); XSS için çıktıda escape.
- **SQL injection:** ORM/parametreli sorgu kullanımı; ham SQL’de parametre binding.
- **Public link:** Token tahmin edilemez (UUID veya crypto-random); `max_views` ve `expires_at` her istekte kontrol.
- **WebSocket:** Subscribe öncesi mutlaka auth/public_token doğrulama; başka kullanıcının listesine subscribe engelleme.
- **HTTPS/WSS:** Production’da zorunlu.
- **Secrets:** JWT secret, DB şifresi, public link salt vb. ortam değişkenlerinde; repo’da yok.
- **Sensitive data:** Response’larda password_hash, internal ID’ler (gerekmedikçe) dönülmemeli.

---

## 7. Edge Case’ler

- **Public link süresi doldu / limit doldu:** GET `/public/wishlists?token=...` 403/404; WebSocket’te `subscribe_public` sonrası `error` event.
- **Liste silinirken WebSocket’te aboneler var:** `list_deleted` broadcast; client listeyi UI’dan kaldırır.
- **Aynı anda iki kullanıcı aynı öğeyi “claim” eder:** Optimistic lock (version alanı) veya “first write wins”; conflict durumunda 409 ve client güncel veriyi çeker.
- **JWT süresi WebSocket bağlıyken dolar:** Heartbeat/ping-pong ile bağlantı canlı; yenileme için client refresh token ile yeni access alıp tekrar `auth` gönderir veya bağlantıyı yeniler.
- **Çok büyük liste:** Öğe sayısı yüksekse sayfalama; WebSocket’te sadece delta (item_added/updated/removed) gönderilir, tam liste değil.
- **Paylaşım kaldırılan kullanıcı hâlâ açık sekmede:** Sonraki REST/WS isteğinde 403; client “erişim kaldırıldı” gösterir.
- **Email ile paylaşımda kullanıcı yok:** Davet kaydı veya “pending invite” oluşturulur; kullanıcı kayıt olunca otomatik share’a eklenir (opsiyonel).
- **Aynı anda çok sayıda bağlantı (DDoS):** WebSocket bağlantı limiti (per user/IP), rate limit.
- **Public link token sızıntısı:** Link iptal (DELETE public-link); yeni token üretilir.

---

## 8. Klasör Yapısı

### 8.1 Frontend (Next.js App Router)

```text
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Ana sayfa (giriş / dashboard yönlendirme)
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── lists/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   └── shared/
│   │       └── page.tsx
│   ├── public/
│   │   └── list/
│   │       └── page.tsx            # ?token=... ile public liste görüntüleme
│   └── api/                        # Gerekirse Next.js API route (proxy vb.)
│       └── ...
├── components/
│   ├── ui/                         # Button, Input, Modal vb.
│   ├── wishlist/
│   │   ├── ListCard.tsx
│   │   ├── ListDetail.tsx
│   │   ├── ItemForm.tsx
│   │   └── ItemCard.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── providers/
│       └── AuthProvider.tsx
├── lib/
│   ├── api.ts                      # REST client (fetch wrapper)
│   ├── auth.ts                     # Token saklama, refresh
│   ├── websocket.ts                # WS bağlantı, subscribe, event handler
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useWishlist.ts
│   ├── useWishlistItems.ts
│   └── useRealtimeList.ts          # WebSocket + state
├── types/
│   └── index.ts                    # User, Wishlist, Item, Share, PublicLink
├── public/
├── next.config.js
├── package.json
└── tsconfig.json
```

### 8.2 Backend (FastAPI)

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py                   # Pydantic Settings (env)
│   ├── dependencies.py             # get_current_user, get_db, public_token
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Tüm route’ları include et
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── wishlists.py
│   │   │   ├── items.py
│   │   │   ├── shares.py
│   │   │   ├── public.py           # GET /public/wishlists
│   │   │   └── public_links.py     # POST/GET/DELETE public link
│   │   └── deps.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py             # JWT create/verify, password hash
│   │   └── websocket.py            # Connection manager, rooms, broadcast
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── wishlist.py
│   │   ├── item.py
│   │   ├── share.py
│   │   └── public_link.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── wishlist.py
│   │   ├── item.py
│   │   ├── share.py
│   │   └── public_link.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── wishlist_service.py
│   │   ├── item_service.py
│   │   └── public_link_service.py
│   └── db/
│       ├── __init__.py
│       ├── session.py
│       └── base.py
├── alembic/                        # Migrations
│   ├── env.py
│   └── versions/
├── tests/
│   ├── conftest.py
│   ├── api/
│   │   ├── test_auth.py
│   │   ├── test_wishlists.py
│   │   └── test_public.py
│   └── ...
├── requirements.txt
├── Dockerfile
└── pyproject.toml
```

---

## 9. Deployment Stratejisi

- **Genel:** Container tabanlı (Docker); orchestration için Kubernetes veya tek sunucuda Docker Compose.
- **Frontend:** Next.js `next build` → static export veya Node server; Nginx veya platform (Vercel) ile serve.
- **Backend:** FastAPI uvicorn/gunicorn; tek replica’da WebSocket için sticky session gerekmez, çok replica’da Redis pub/sub ile odalar arası mesaj iletişimi (aynı odadaki kullanıcılar farklı pod’larda olabilir).
- **Veritabanı:** PostgreSQL yönetilen servis (RDS, Cloud SQL, Supabase) veya container; backup ve point-in-time recovery açık.
- **Ortam:** `.env` ile `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `WS_ORIGIN`; production’da secret’lar vault veya platform secret manager’dan.
- **CI/CD:** Push’ta test + build; main’e merge’da staging/production deploy (GitHub Actions veya benzeri).
- **Monitoring:** Uygulama logları (JSON), health endpoint (`/health`), metrics (Prometheus/OpenTelemetry); WebSocket bağlantı sayısı ve hata oranları izlenir.
- **Ölçekleme:** API ve WebSocket replica sayısı yük ile artırılır; DB connection pooling (PgBouncer) kullanılır.

---

Bu belge, implementasyona geçmeden önce mimari, veri modeli, API, WebSocket, güvenlik, edge case’ler, klasör yapısı ve deployment için tek referans noktası olarak kullanılabilir. Onay sonrası adım adım kodlama yapılabilir.
