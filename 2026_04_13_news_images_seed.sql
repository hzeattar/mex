-- Optional seed for the new in-app news center.
-- Run after deployment only if you want to refresh demo/sample announcements manually.

INSERT INTO announcements(slug,title_en,title_ar,title_ru,body_en,body_ar,body_ru,image_url,cta_url,source_label,status,pinned,published_at,created_at,updated_at)
SELECT 'news-center-manual-seed','The in-app news center is enabled','تم تفعيل مركز الأخبار داخل المنصة','Встроенный центр новостей активирован',
       'Open the new news page from the main menu to read announcements with images, pinned updates, and operations notes.',
       'افتح صفحة الأخبار الجديدة من القائمة الرئيسية لقراءة الإعلانات مع الصور والتحديثات المثبتة وملاحظات التشغيل.',
       'Откройте новую страницу новостей из главного меню, чтобы читать объявления с изображениями и закреплёнными обновлениями.',
       '/assets/img/news/news-center.svg','#/news','Platform Updates','published',1,UNIX_TIMESTAMP(),UNIX_TIMESTAMP(),UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE slug='news-center-manual-seed');
