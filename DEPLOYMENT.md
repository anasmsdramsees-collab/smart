# SYLTRA Platform - Deployment Guide

## Quick Start with Docker Compose

### المتطلبات
- Docker و Docker Compose مثبتة
- Server بـ 2GB RAM على الأقل

### خطوات التثبيت

#### 1. إعداد Server

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Clone المشروع

```bash
git clone https://github.com/syltra-space/platform.git
cd platform
```

#### 3. إعداد البيئة

```bash
cp .env.example .env
nano .env  # عدّل القيم
```

#### 4. بدء التطبيق

```bash
docker-compose up -d
```

### الوصول إلى التطبيق

- Dashboard: http://your-server-ip:3001
- API: http://your-server-ip:3000

### حساب الاختبار
- Email: test@syltra.sa
- Password: 12345678

### الخدمات

- Frontend (Next.js): Port 3001
- Backend API (NestJS): Port 3000
- Database (PostgreSQL): Port 5432
- MQTT Broker: Port 1883, 9001
