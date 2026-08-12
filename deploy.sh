#!/bin/bash

echo "🚀 SYLTRA Platform Deployment"
echo "=============================="

# تحقق من Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker غير مثبت"
    exit 1
fi

echo "✅ Docker و Docker Compose موجودة"

# إنشاء .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  عدّل .env ثم شغّل الـ script مجددا"
    exit 1
fi

# إنشاء مجلدات
mkdir -p nginx/ssl mosquitto/config mosquitto/data mosquitto/log

# SSL certificate (self-signed)
if [ ! -f nginx/ssl/cert.pem ]; then
    openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"
fi

# بدء الخدمات
echo "🏗️  بناء وتشغيل الخدمات..."
docker-compose up -d --build

sleep 10

echo ""
echo "✨ تم النشر بنجاح!"
echo ""
echo "الروابط:"
echo "  - Dashboard: http://localhost:3001"
echo "  - API: http://localhost:3000"
echo ""
echo "حساب الاختبار:"
echo "  Email: test@syltra.sa"
echo "  Password: 12345678"
