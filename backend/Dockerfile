FROM python:3.12-slim

WORKDIR /app

# Requirements dosyasını kopyala ve bağımlılıkları yükle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodunu kopyala
COPY . .

# Port'u expose et
EXPOSE 8000

# Uygulama'yı başlat
# Railway'de PORT environment variable'ı otomatik sağlanır, ama sabit port kullanıyoruz
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
