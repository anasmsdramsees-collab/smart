# 🚀 نشر SYLTRA الآن

## النسخة السريعة (3 دقائق فقط)

### على أي VPS (DigitalOcean, Linode, AWS, إلخ):

```bash
# 1️⃣ تثبيت Docker (مرة واحدة)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2️⃣ Clone المشروع
git clone https://github.com/syltra-space/platform.git
cd platform

# 3️⃣ شغّل deploy script
bash deploy.sh
```

**هذا يشغّل كل شيء:**
- ✅ Frontend (Next.js) على Port 3001
- ✅ Backend API (NestJS) على Port 3000  
- ✅ Database (PostgreSQL)
- ✅ MQTT Broker

### الوصول:

```
🏠 Dashboard: http://YOUR_SERVER_IP:3001
⚙️ API: http://YOUR_SERVER_IP:3000

📧 Email: test@syltra.sa
🔑 Password: 12345678
```

---

## بعد النشر:

```bash
# اعرض السجلات
docker-compose logs -f

# قف التطبيق
docker-compose down

# أعد التشغيل
docker-compose up -d
```

---

## للـ Production (Domain + SSL):

```bash
# غيّر IP في .env إلى domain
NEXT_PUBLIC_API_URL=https://your-domain.com

# أضف SSL certificates:
# ضع ملفات cert.pem و key.pem في nginx/ssl/

# أعد التشغيل
docker-compose down
docker-compose up -d
```

---

**تم! المنصة تعمل online الآن** 🎉
