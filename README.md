# فصلي — منصة تعليمية مجانية (Next.js + Tailwind + Supabase)

## 1. التثبيت
```bash
npm install
cp .env.example .env.local   # ثم ضع قيم Supabase
npm run dev
```

## 2. إعداد Supabase
1. أنشئ مشروعاً جديداً على supabase.com (الخطة المجانية تكفي).
2. Authentication → Providers → Email: **عطّل "Confirm email"** للبداية السريعة.
3. SQL Editor → الصق محتوى `supabase/schema.sql` ثم شغّله.
4. Project Settings → API: انسخ `URL` و `anon key` إلى `.env.local`.

## 3. هيكل المشروع
```
app/
  layout.tsx                  تخطيط عام (RTL + خط عربي)
  page.tsx                    تحويل إلى /dashboard
  login/ register/            صفحات الدخول والتسجيل
  auth/actions.ts             server actions للمصادقة
  dashboard/page.tsx          توجيه حسب الدور
  teacher/
    layout.tsx                حماية دور الأستاذ + الترويسة
    page.tsx                  قائمة الأقسام + إنشاء قسم
    classes/[id]/page.tsx     طلبات الانضمام، التلاميذ، الواجبات
    classes/[id]/assignments/[assignmentId]/page.tsx   الحلول + التصحيح
  student/
    layout.tsx                حماية دور التلميذ + الترويسة
    page.tsx                  أقسامي + تصفّح الأقسام + طلب انضمام
    classes/[id]/page.tsx     الواجبات (بعد القبول)
    assignments/[assignmentId]/page.tsx   التمرين + الماسح + النتيجة
components/
  AppHeader.tsx
  scanner/Scanner.tsx         واجهة الكاميرا والمعاينة والرفع
  scanner/imageFilters.ts     معالجة الصورة (إزالة الظل، Otsu، تباين)
lib/
  auth.ts                     getCurrentProfile / requireRole
  types.ts
  actions/teacher.ts          إنشاء قسم، قبول/رفض، واجب، تصحيح
  actions/student.ts          طلب انضمام
  supabase/server.ts | client.ts | middleware
middleware.ts                 حماية المسارات وتحديث الجلسة
supabase/schema.sql           الجداول + RLS + التخزين
```

## 4. ملاحظات
- الكاميرا تحتاج HTTPS أو `localhost`.
- الملفات الخاصة (PDF والحلول) تُعرض عبر روابط موقّعة صالحة لساعة واحدة.
- سياسات RLS تضمن أن التلميذ لا يرى إلا أقسامه المقبولة، وأن الأستاذ يرى حلول قسمه فقط.
- مواعيد التسليم تُحسب بالتوقيت المحدد في `NEXT_PUBLIC_TZ_OFFSET`.
