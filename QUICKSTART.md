# Hızlı Başlangıç — Yerelde Test

Backend + Frontend + PostgreSQL ile uygulamayı yerelde çalıştırma.

---

## 1. PostgreSQL

Yerelde PostgreSQL gerekli. Seçenekler:

### A) Zaten yüklüyse

- Varsayılan: `postgres` kullanıcı, `postgres` şifre, port `5432`.
- Veritabanı oluştur:
  ```bash
  psql -U postgres -c "CREATE DATABASE wishlist;"
  ```

### B) Docker ile (PostgreSQL yoksa)

```bash
docker run -d --name wishlist-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wishlist -p 5432:5432 postgres:16
```

---

## 2. Backend

```bash
cd backend
```

### Sanal ortam ve bağımlılıklar

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Ortam değişkenleri

`backend` klasöründe `.env` dosyası oluştur (yoksa `.env.example`'dan kopyala):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wishlist
JWT_SECRET_KEY=test-secret-key-en-az-32-karakter-uzunlugunda
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
DEBUG=true
```

### Migrations

```bash
# backend klasöründeyken, .venv aktif
set PYTHONPATH=.     # Windows
# export PYTHONPATH=.   # macOS/Linux

alembic upgrade head
```

### API’yi başlat

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Dokümantasyon: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

Bu terminali açık bırak.

---

## 3. Frontend

Yeni bir terminal aç:

```bash
cd frontend
npm install
```

### Ortam (opsiyonel)

Varsayılanlar backend’i `http://localhost:8000` kabul eder. Değiştirmek için:

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Uygulamayı başlat

```bash
npm run dev
```

- Uygulama: http://localhost:3000  

---

## 4. Test Akışı

1. http://localhost:3000 → Landing veya “Sign up”.
2. **Kayıt:** Email + şifre ile hesap oluştur.
3. **Giriş** sonrası “My lists” → “New list” → Liste oluştur.
4. Listeye gir → “Add item” → Öğe ekle.
5. “I’ll get this” / “Mark purchased” ile rezervasyon dene.
6. “Copy public link” → Yeni sekmede bu linki aç (giriş yapmadan görüntüleme).
7. İki sekmede aynı listeyi açıp birinde öğe ekleyin → Diğerinde anında görünmeli (Live).

---

## 5. Sorun Giderme

| Sorun | Çözüm |
|-------|--------|
| `ModuleNotFoundError: app` | Backend’de `set PYTHONPATH=.` (Windows) veya `export PYTHONPATH=.` (macOS/Linux) yapıp tekrar dene. |
| `connection refused` (DB) | PostgreSQL çalışıyor mu? Port 5432 açık mı? `.env` içindeki kullanıcı/şifre/DB adı doğru mu? |
| CORS hatası | Backend `.env` içinde `CORS_ORIGINS=["http://localhost:3000"]` olduğundan emin ol. |
| Frontend API’ye ulaşamıyor | Backend 8000’de çalışıyor mu? `NEXT_PUBLIC_API_URL=http://localhost:8000` (trailing slash yok). |

---

## Tek Komutla (Backend + Frontend aynı anda)

İki ayrı terminal kullanmak en net yöntem. İstersen:

**Terminal 1 (backend):**
```bash
cd backend && .venv\Scripts\activate && set PYTHONPATH=. && uvicorn app.main:app --reload --port 8000
```

**Terminal 2 (frontend):**
```bash
cd frontend && npm run dev
```

Sonra tarayıcıda http://localhost:3000 adresine git.
