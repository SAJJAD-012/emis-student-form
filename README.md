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
4. الاستمارة: http://localhost:3000  
   سجل الطلبة: http://localhost:3000/students.html  
   إعداد الشات: http://localhost:3000/setup.html

## ملاحظات

- لا ترفع ملف `.env` إلى GitHub (يحتوي أسراراً).
- GitHub Pages لا يشغّل خادم Node؛ للاستضافة العامة استخدم خدمة مثل Render / Railway / VPS مع نفس الأوامر أعلاه.
