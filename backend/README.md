# Wishlist API (Backend)

FastAPI backend for the real-time social wishlist application: PostgreSQL, JWT auth, WebSockets, wishlist CRUD, reservation and contribution logic.

## Stack

- **FastAPI** – REST + WebSocket
- **SQLAlchemy 2.0 (async)** – PostgreSQL via asyncpg
- **Alembic** – migrations
- **JWT** – access + refresh tokens (python-jose)
- **Passlib (bcrypt)** – password hashing

## Setup

### 1. Virtual environment and dependencies

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### 2. Environment

Copy `.env.example` to `.env` and set at least:

- `DATABASE_URL` / `DATABASE_URL_SYNC` for PostgreSQL
- `JWT_SECRET_KEY` for production

### 3. Database and migrations

Create the DB (e.g. `createdb wishlist`), then:

```bash
# From backend directory so app is importable
set PYTHONPATH=.   # Windows
# export PYTHONPATH=.  # Linux/macOS
alembic upgrade head
```

### 4. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- WebSocket: ws://localhost:8000/api/v1/ws  

## Project structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, health
│   ├── config.py         # Settings (env)
│   ├── api/
│   │   ├── deps.py       # get_db, get_current_user, wishlist access
│   │   └── v1/
│   │       ├── router.py
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── wishlists.py
│   │       ├── items.py
│   │       ├── shares.py
│   │       ├── public.py
│   │       ├── public_links.py
│   │       └── ws.py
│   ├── core/
│   │   ├── security.py   # JWT, password hash
│   │   └── websocket.py   # ConnectionManager, rooms, broadcast
│   ├── db/
│   │   ├── base.py       # Base, mixins
│   │   └── session.py    # Async engine, get_db
│   ├── models/
│   ├── schemas/
│   └── services/
├── alembic/
├── requirements.txt
└── README.md
```

## Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login (returns access + refresh) |
| POST | `/api/v1/auth/refresh` | New access token (body: `refresh_token`) |
| GET | `/api/v1/users/me` | Current user (Bearer) |
| GET/POST | `/api/v1/wishlists` | List / create wishlists |
| GET/PATCH/DELETE | `/api/v1/wishlists/{id}` | Wishlist CRUD |
| GET/POST | `/api/v1/wishlists/{id}/items` | List / add items |
| PATCH/DELETE | `/api/v1/wishlists/{id}/items/{itemId}` | Update (incl. reservation) / delete item |
| GET/POST/DELETE | `/api/v1/wishlists/{id}/shares` | Shares (owner) |
| GET | `/api/v1/public/wishlists?token=` | Public list by token (no auth) |
| POST/GET/DELETE | `/api/v1/wishlists/{id}/public-link` | Create / get / revoke public link |
| WS | `/api/v1/ws` | WebSocket (query: `access_token` or `public_token`) |

## WebSocket

- **URL:** `ws://localhost:8000/api/v1/ws`
- **Auth:** `?access_token=<JWT>` then send `{"event":"subscribe","wishlist_id":"<uuid>"}`  
  Or `?public_token=<token>` to subscribe to a public list.
- **Events (server → client):** `subscribed`, `item_added`, `item_updated`, `item_removed`, `error`.

## Reservation and contribution

- **Reservation:** PATCH an item with `reservation_status`: `available` | `reserved` | `purchased` (optional `reservation_message`). Stored on the item and optionally logged in `contributions`.
- **Contribution:** Adding an item (as non-owner) sets `contributed_by_id` and creates a row in `contributions` with kind `item_added`; reserving/purchasing creates `item_reserved` / `item_purchased`.
