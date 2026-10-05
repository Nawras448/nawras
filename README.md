# مدونة نوّاس

مدونة شخصية عربية (RTL) بموقع ثابت 100% — تُنشر تلقائيًا على GitHub Pages.

## كيف تضيف مقالًا جديدًا؟

1. أنشئ ملفًا جديدًا داخل مجلد `articles/`، وليكن اسمه باللاتينية بدون مسافات، مثلًا:
   `articles/my-new-article.md`
2. اكتب في أول الملف واجهة أمامية (front matter) ثم المتن بلغة Markdown:

```markdown
---
title: عنوان المقال بالعربية
date: 2026-10-05
category: تقنية
excerpt: سطر أو سطران يلخصان المقال.
image: assets/images/cover-1.svg
featured: false
---

نص المقال هنا بلغة Markdown...

## عنوان فرعي

7
- نقطة أولى
- نقطة ثانية

> اقتباس مميز
```

3. احفظ ثم ادفع إلى GitHub:

```bash
git add articles/my-new-article.md
git commit -m "مقال جديد: عنوان المقال"
git push origin main
```

سيعمل الـ workflow تلقائيًا ويعيد بناء الموقع ونشره. لا حاجة لأي تعديل برمجي.

- `slug` يُشتق من اسم الملف.
- إن غاب `excerpt` يُؤخذ أول ~160 حرفًا من المتن.
- إن غابت `image` تُعرض بطاقة نصية أو صورة SVG افتراضية.
- زمن القراءة يُحسب تلقائيًا (~200 كلمة/دقيقة).

## التشغيل محليًا

```bash
npm install
npm run build
npx serve dist
```

ثم افتح `http://localhost:3000`.

## تخصيص الموقع

كل الإعدادات في ملف `site.config.json`:

- **اسم الموقع:** غيّر `siteName` و `tagline` و `description`.
- **الألوان:** غيّرها من ملف `assets/css/style.css` داخل `:root`:
  `--bg` (الخلفية البيج)، `--ink` (الأسود)، `--accent` (البرتقالي)،
  ونسخها الداكنة داخل `[data-theme="dark"]`.
- **روابط التواصل:** عدّل مصفوفة `social` (الرابط والنص).
- **روابط التنقل:** عدّل مصفوفة `nav`.

## النشر على GitHub Pages

1. أنشئ مستودعًا عامًا باسم `nawras`.
2. ادفع فرع `main`.
3. فعّل Pages: Settings ← Pages ← Source ← GitHub Actions.
4. رابط موقعك سيكون: `https://<username>.github.io/nawras/`
