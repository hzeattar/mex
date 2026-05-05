# إعداد LeadBot داخل النسخة الحالية

## 1) رفع الملفات
ارفع النسخة مكان ملفات المشروع الحالية ثم افتح لوحة الأدمن.

## 2) إضافة المديرين
من:
- `/admin/lead_managers.php`

أضف كل مدير حساب مع:
- Telegram ID
- الاسم
- اليوزرنيم إن وجد

> مهم: المدير لازم يفتح كل بوت مرة واحدة ويعمل `/start`.

## 3) إضافة البوتات
من:
- `/admin/lead_bots.php`

أضف:
- اسم البوت
- Bot Username
- Bot Token
- Owner Chat ID
- المدير الافتراضي
- Brand Name

ثم افتح:
- `/leadbot/set_webhook.php?id=BOT_ID`

أو من زر **Set Webhook** داخل صفحة البوتات.

## 4) إضافة الحملات
من:
- `/admin/lead_campaigns.php`

أضف لكل حملة:
- اسم الحملة
- Source Code
- البوت
- المدير الافتراضي
- المنصة

مثال Source Code:
- `mgr_ahmed_fb1`
- `mex_fb_uae_01`

## 5) رابط الإعلان
لو Username البوت هو `mexgroup_leads_bot` وكان الـ source_code هو `mgr_ahmed_fb1`
فالرابط يكون:

`https://t.me/mexgroup_leads_bot?start=mgr_ahmed_fb1`

## 6) تعديل الفلو
من:
- `/admin/leadbot_flow.php`

هناك ستجد كل نصوص الأسئلة والاختيارات قابلة للتعديل.

## 7) متابعة العملاء
من:
- `/admin/leadbot_dashboard.php`
- `/admin/leads.php`

## 8) كرون المتابعات v2
لتفعيل تذكيرات الـ follow-up:

`/api/cron/leadbot_followups.php?token=CRON_KEY`

مثال كرون كل 5 دقائق:

```bash
*/5 * * * * /usr/local/bin/php -q /home/USER/public_html/api/cron/leadbot_followups.php token=YOUR_CRON_KEY >/dev/null 2>&1
```

ولو على استضافة لا تسمح بالـ CLI استعمل Cron HTTP من cPanel.

## 9) ملاحظات مهمة
- التواصل **داخل البوت** يعمل عبر أزرار `رد داخل البوت`.
- التواصل **خارج البوت** يتم من رقم الهاتف أو يوزرنيم العميل.
- صاحب البوت أيضًا يمكنه الرد من نفس البوت لو وضع `Owner Chat ID` الصحيح.
