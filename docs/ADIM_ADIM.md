# Adım Adım Kurulum ve Vercel’e Yükleme

Bu rehber: önce yerelde çalıştırma, sonra Vercel (ve backend/veritabanı) ile yayına alma.

---

## Bölüm 1: Yerelde Çalıştırma

### Veritabanı nedir, nerede “açılır”?

Uygulama veriyi **PostgreSQL** veritabanında tutar. İki seçenek var:

| Seçenek | Açıklama |
|--------|----------|
| **Yerel PostgreSQL** | Bilgisayarına PostgreSQL kurarsın; veritabanı kendi makinede çalışır. |
| **Docker ile PostgreSQL** | PostgreSQL yüklü değilse, tek komutla bir “konteyner” içinde PostgreSQL çalıştırırsın. |

“Veritabanını bir yerde açmak” = PostgreSQL’in çalışır olması + `wishlist` adında bir veritabanının olması demek.

---

### Adım 1: PostgreSQL’i çalıştır

**A) Docker kuruluysa (en kolay):**

Yeni bir terminal açıp şunu çalıştır:

```powershell
docker run -d --name wishlist-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wishlist -p 5432:5432 postgres:16
```

Bu komut:

- PostgreSQL’i arka planda çalıştırır
- Kullanıcı: `postgres`, şifre: `postgres`
- Veritabanı adı: `wishlist` (otomatik oluşturulur)
- Port: `5432`

Başka bir şey yapmana gerek yok; veritabanı “açık” demektir.

**B) Zaten PostgreSQL yüklüyse:**

1. PostgreSQL servisinin çalıştığından emin ol (Windows: Hizmetler’den “PostgreSQL”).
2. `wishlist` veritabanını oluştur:

```powershell
psql -U postgres -c "CREATE DATABASE wishlist;"
```

Şifre sorarsa, kurulumda belirlediğin postgres şifresini yaz.  
Eğer kullanıcı/şifre farklıysa, `backend/.env` içindeki `DATABASE_URL` ve `DATABASE_URL_SYNC` satırlarını kendi bilgilerinle güncelle.

---

### Adım 2: Backend’i hazırla ve çalıştır

1. **Terminal 1** aç, `backend` klasörüne gir:

```powershell
cd c:\Users\ACER\Desktop\test2\backend
```

2. Sanal ortamı aktif et (kurulumu daha önce yaptıysan):

```powershell
.\.venv\Scripts\Activate.ps1
```

3. PYTHONPATH ver (Windows’ta):

```powershell
$env:PYTHONPATH = (Get-Location).Path
```

4. Veritabanı tablolarını oluştur (migration):

```powershell
py -m alembic upgrade head
```

“OK” veya revision mesajları görürsen tablolar oluştu.

5. API’yi başlat:

```powershell
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Şunu görürsen backend hazır: `Uvicorn running on http://0.0.0.0:8000`  
Bu terminali **açık bırak**.

- API: http://localhost:8000  
- Dokümantasyon: http://localhost:8000/docs  

---

### Adım 3: Frontend’i çalıştır

1. **Yeni bir terminal (Terminal 2)** aç.
2. Frontend klasörüne gir ve bağımlılıkları yükle (ilk seferde):

```powershell
cd c:\Users\ACER\Desktop\test2\frontend
npm install
```

3. Geliştirme sunucusunu başlat:

```powershell
npm run dev
```

4. Tarayıcıda aç: **http://localhost:3000**

Kayıt ol → liste oluştur → öğe ekle → test et.

---

## Bölüm 2: Vercel’e (ve Genel Yayına) Yükleme

Bu projede üç parça var:

| Parça | Nerede çalışır | Açıklama |
|-------|-----------------|----------|
| **Frontend** (Next.js) | **Vercel** | Kullanıcının gördüğü arayüz. Vercel’e yükleyeceksin. |
| **Backend** (FastAPI) | **Render / Railway / VPS** | API ve WebSocket. Vercel sadece frontend için; backend ayrı bir servise deploy edilir. |
| **Veritabanı** (PostgreSQL) | **Neon / Render / Railway / Supabase** | Bulutta bir “managed PostgreSQL” açarsın; backend buna bağlanır. |

Yani: **Veritabanını “bir yerde açmak”** = Bulutta bir PostgreSQL servisi oluşturup, bağlantı adresini (URL) backend’e vermek.

---

### Adım 4: Bulutta veritabanı aç

1. Şu servislerden birine gir: **Neon**, **Railway**, **Render** veya **Supabase**.
2. Yeni bir **PostgreSQL** veritabanı oluştur.
3. **Connection string** (bağlantı adresi) kopyala. Örneğin:
   - `postgresql://kullanici:sifre@host.region.aws.neon.tech/veritabani?sslmode=require`

Backend için iki URL kullanacaksın:

- **Uygulama (async):** `postgresql://` yerine `postgresql+asyncpg://` yaz.
- **Migration (sync):** Aynı adresi `postgresql://` olarak kullan (veya sadece async’i verirsen proje otomatik sync’i türetir).

Bunu ileride backend’i deploy ettiğin yerde (Render/Railway) `DATABASE_URL` olarak yapıştıracaksın.

---

### Adım 5: Backend’i bulutta çalıştır (Render veya Railway)

Detay için `docs/DEPLOYMENT.md` dosyasına bak. Kısaca:

1. **Render** veya **Railway**’de yeni bir “Web Service” / “Backend” oluştur.
2. Repoyu (GitHub) bağla; **root directory** olarak `backend` seç.
3. **Environment variables** ekle:
   - `DATABASE_URL`: Buluttaki PostgreSQL bağlantı adresi (`postgresql+asyncpg://...`).
   - `JWT_SECRET_KEY`: Uzun rastgele bir string (örn. `openssl rand -hex 32` ile üret).
   - `CORS_ORIGINS`: `["https://senin-uygulama.vercel.app"]` (Vercel’deki frontend adresin).
4. Deploy sonrası **bir kez** migration çalıştır (Render Shell veya Railway’de “Run command”):
   - `alembic upgrade head`
5. Backend’in adresini not et, örn: `https://wishlist-api.onrender.com`

---

### Adım 6: Frontend’i Vercel’e yükle

1. **Vercel** (vercel.com) → GitHub hesabınla giriş yap.
2. “Add New” → “Project” → Bu projenin repoyu seç.
3. **Root Directory:** `frontend` olarak ayarla.
4. **Environment variables** ekle:
   - `NEXT_PUBLIC_API_URL` = Backend adresin (örn. `https://wishlist-api.onrender.com`) — **sonunda / olmamalı**.
   - İsteğe bağlı: `NEXT_PUBLIC_WS_URL` = WebSocket adresi (çoğu zaman backend ile aynı host, farklı path).
5. Deploy’a tıkla.

Vercel, frontend’i derleyip yayınlar. Artık `https://xxx.vercel.app` adresinden uygulamaya erişirsin; bu adres backend’deki `CORS_ORIGINS` ile aynı olmalı.

---

## Özet

| Ne yapıyorsun? | Ne yapmalısın? |
|----------------|----------------|
| **Yerelde veritabanı** | Docker ile PostgreSQL çalıştır veya yüklü PostgreSQL’de `wishlist` veritabanını oluştur. |
| **Yerelde backend** | `.env` hazır → `alembic upgrade head` → `uvicorn app.main:app --reload --port 8000`. |
| **Yerelde frontend** | `npm install` → `npm run dev` → http://localhost:3000. |
| **Vercel’e yükleme** | Sadece **frontend** Vercel’e; **backend** Render/Railway’e, **veritabanı** Neon/Render/Railway/Supabase’te. Hepsinin env değişkenleri birbirine uyumlu olmalı (CORS, API URL, DATABASE_URL). |

Daha ayrıntılı production adımları için: `docs/DEPLOYMENT.md`.
