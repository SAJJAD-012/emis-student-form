# استمارة EMIS — مدرسة قطر

استمارة تحديث بيانات الطلبة مع إرسال إلى تيليجرام وحفظ محلي مرتّب حسب الصف والشعبة.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env` واملأ:
   ```
   TELEGRAM_BOT_TOKEN=توكن_البوت
   TELEGRAM_CHAT_ID=
   PORT=3000
   ```
2. افتح البوت في تيليجرام وأرسل `/start`
3. ثبّت وشغّل:
   ```bash
   npm install
   npm start
   ```
4. الاستمارة العامة: http://localhost:3000  
   دخول الإدارة (سجل الطلبة): http://localhost:3000/admin-login.html  

## ملاحظات

- سجل الطلبة محمي بكلمة `ADMIN_PASSWORD` — لا يظهر للعامة.
- لا ترفع ملف `.env` إلى GitHub.
- للنشر على Render: اربط المستودع `SAJJAD-012/emis-student-form` وأضف متغيرات البيئة من `.env.example`.
