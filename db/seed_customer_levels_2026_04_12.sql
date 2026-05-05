-- baseline customer levels
START TRANSACTION;
DELETE FROM customer_levels;
INSERT INTO customer_levels(level_code,name_en,name_ar,name_ru,perks_en,perks_ar,perks_ru,min_deposit_total,sort_order,status,created_at,updated_at) VALUES
('level1','Level 1','المستوى 1','Уровень 1','Signals dashboard
Base contracts
Leverage up to 1:100','لوحة الإشارات
عقود أساسية
رافعة حتى 1:100','Сигнальный стол
Базовые контракты
Плечо до 1:100',0,10,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('level2','Level 2','المستوى 2','Уровень 2','Copy trading access
Standard contracts
Leverage up to 1:200','نسخ الصفقات
عقود قياسية
رافعة حتى 1:200','Копирование сделок
Стандартные контракты
Плечо до 1:200',10000,20,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('level3','Level 3','المستوى 3','Уровень 3','Premium contracts
Priority support
Leverage up to 1:300','عقود بريميوم
دعم أولوية
رافعة حتى 1:300','Премиум контракты
Приоритетная поддержка
Плечо до 1:300',25000,30,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('level4','Level 4','المستوى 4','Уровень 4','Advanced copy desk
Higher contract caps
Leverage up to 1:400','منصة نسخ متقدمة
حدود عقود أعلى
رافعة حتى 1:400','Продвинутый стол копирования
Больше лимиты по контрактам
Плечо до 1:400',50000,40,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()),
('vip','VIP','كبار العملاء','VIP','Private desk
VIP contracts
Leverage up to 1:500','منصة خاصة
عقود VIP
رافعة حتى 1:500','Частный стол
VIP контракты
Плечо до 1:500',100000,50,'active',UNIX_TIMESTAMP(),UNIX_TIMESTAMP());
COMMIT;
