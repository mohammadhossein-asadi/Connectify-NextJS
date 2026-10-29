# Connectify

### پلتفرم کامل شبکه اجتماعی — وصل شوید. به اشتراک بگذارید. ایده‌ها را با هوش مصنوعی به هم بزنید.

یک شبکه اجتماعی تولیدی و کامل — نه یک نمونه اولیه. شامل احراز هویت کاربر با JWT، چرخه تمام زندگی پست (ایجاد، لایک، واکنش، کامنت، به اشتراک، نشان‌دار)، داستان‌ها با ویرایش تصویر، پیام مستقیم با ربات چت هوش مصنوعی، داشبورد‌های تحلیلی، اعلان‌ها و ویژگی‌های کشف/کشف — با ۲۹+ مقاصد REST API.

[![نمونه زنده](https://img.shields.io/badge/نمونه_زنده-connectify.ai-0a0a0a?style=for-the-badge&labelColor=0a0a0a&color=3b82f6)](https://connectify.ai)
[![مجوز: MIT](https://img.shields.io/badge/مجوز-MIT-0a0a0a?style=for-the-badge&labelColor=0a0a0a&color=22c55e)](LICENSE)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express_4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Overview

Connectify یک پلتفرم شبکه اجتماعی کامل است — نه یک نمونه اولیه. شامل احراز هویت کاربر با JWT، چرخه تمام زندگی پست (ایجاد، لایک، واکنش، کامنت، به اشتراک، نشان‌دار)، داستان‌ها با ویرایش تصویر، پیام‌رسانی مستقیم با ربات چت هوش مصنوعی، داشبورد‌های تحلیلی، اعلان‌ها، و ویژگی‌های کشف/کشف.

پشتیبانی روی Express با پایگاه داده JSON در حافظه می‌چرخد، به Google Cloud Run استقرار یافته. روپه‌ی رابط کاربری یک SPA ساخته‌شده با ویت موتور و در Vercel استقرار یافته با پروکسی مقاصد به پشتیبانی.

---

## ویژگی‌ها

| ویژگی | توضیح |
|:--------|:------------|
| **احراز هویت** | ثبت‌نام، ورود، صداقت‌دانسته sessions، حساب‌های نمایشی با JWT |
| **خوراک اجتماعی** | پست‌ها با متن غنی، گالری‌های تصویر/ویدیو، بازترتیب رسانه باdrag-drop |
| **واکنش‌ها و کامنت‌ها** | لایک، قلب، آتش، خنده واکنش‌هاplus کامنت‌های پنجه‌وار |
| **داستان‌ها** | ایجاد داستان از تصویر، ویدیو یا متن با فیلترها و نا 오버레이 |
| **پیام‌رسانی مستقیم** | چت بلادرهنگام با نشان‌دهنده در حال収打، دستخوش، جستجوی پیام |
| **ربات چت هوش مصنوعی** | GeminiBot با OpenRouter که از طریق پیام مستقیم با نشان‌دهنده تاییدکننده قابل دسترسی است |
| **تولید پست هوش مصنوعی** | خلق پیش‌نویس پست با قدرت Google Gemini |
| **کشف و کشف** | هشتگ‌های ر 바라는، دسته‌بندی، پیشنهادهای کاربر |
| **داشبورد تحلیلی** | پست‌ها، فالوورها، امتیاز تعامل، نمودارهای مصورسازی |
| **اعلان‌ها** | لایک، کامنت، فالو، پیام، سیستم، تایید، اشاره‌چین انواع |
| **نشان‌دارها** | ذخیره و مدیریت پست‌های نشان‌دار |
| **پروفایل‌های کاربر** | بیو، تصویر آواتار، عکس کاور، وب‌سایت، موقعیت، سیستم تاییدکننده |
| **تم تاریک/روشن** | سوئیچ 三 switcher با تشخیص ترجیح سیستم |
| **چیدمان واکنش‌گرا** | سه ستونه دسکتاپ، ستونه تکی موبایل با ناوبری پایین |

---

## پشته فناوری

| لایه | فناوری‌ها |
|:------|:-------------|
| **روپه‌ی رابط کاربری** | React 19، TypeScript 5.8، Vite 6.2 |
| **استایل‌دهی** | Tailwind CSS 4 |
| **انیمیشن** | Motion (Framer Motion) 12 |
| **پشتیبانی** | Node.js، Express 4، ماندپایه JSON |
| **احراز هویت** | توکن‌های وب JSON، bcryptjs |
| **هوش مصنوعی** | Google Gemini، OpenRouter |
| **آیکون‌ها** | Lucide React |
| **فونت‌ها** | Inter، Space Grotesk |
| **استقرار** | Vercel (روپه‌ی رابط کاربری) + Google Cloud Run (پشتیبانی) |

---

## ساختار پروژه

```
Connectify-NextJS/
├── src/
│   ├── components/
│   │   ├── Feed.tsx            # نمای خوراک اصلی
│   │   ├── Explore.tsx         # کشف و ر 바란
│   │   ├── Messages.tsx        # پیام‌رسانی مستقیم
│   │   ├── Notifications.tsx   # مرکز اعلان‌ها
│   │   ├── Profile.tsx         # پروفایل‌های کاربر
│   │   ├── Analytics.tsx       # داشبورد تحلیلی
│   │   ├── Bookmarks.tsx       # پست‌های ذخیره‌شده
│   │   ├── Settings.tsx        # تنظیمات پروفایل
│   │   ├── AuthModal.tsx       # ورود/ثبت‌نام
│   │   ├── StoriesList.tsx     # کاروسل داستان‌ها
│   │   ├── StoriesModal.tsx    # نماینده داستان
│   │   ├── PostCreate.tsx      # خلق پست
│   │   └── post/               # زیرمكون‌های پست
│   ├── lib/
│   │   ├── api.ts              # کلاینت API متمرکز
│   │   └── utils.ts            # ابزارهای مشترک
│   ├── App.tsx                 # روت کردن ریشه
│   └── types.ts                # رابط‌های TypeScript
├── server.ts                   # پشتیبانی Express (۲۹+ endpoint)
├── db.json                     # پایگاه داده در حافظه
├── vercel.json                 # پیکربندی استقرار Vercel
├── index.html                  # پوسته HTML با metadata SEO
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## مقاصد API

| مسیر | روش | هدف |
|:------|:-------|:--------|
| `/api/auth/register` | POST | ثبت‌نام کاربر |
| `/api/auth/login` | POST | ورود (محدودیت نرخ) |
| `/api/posts` | GET/POST | فهرست/خلق پست‌ها |
| `/api/posts/:id/like` | POST | لایک/نلایک |
| `/api/posts/:id/react` | POST | واکنش‌های اموجی |
| `/api/posts/:id/comment` | POST | افزودن کامنت |
| `/api/stories` | GET/POST | فهرست/خلق داستان‌ها |
| `/api/messages` | GET/POST | پیام‌رسانی مستقیم |
| `/api/notifications` | GET | اعلان‌های کاربر |
| `/api/users/recommendations` | GET | پیشنهادهای کاربر |
| `/api/analytics` | GET | داده‌های تحلیلی |
| `/api/gemini/generate-post-draft` | POST | تولید محتوای هوش مصنوعی |

*۳۲+ endpoint کل — قلم عاملیобы `server.ts`.*

---

## شروع سریع

### پیش‌نیازها

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### نصب

```bash
git clone https://github.com/mohammadhossein-asadi/Connectify-NextJS.git
cd Connectify-NextJS
npm install
```

### پیکربندی محیط

یک فایل `.env` ایجاد کنید (به `.env.example` مراجعه کنید):

```env
JWT_SECRET="your-jwt-secret"
GEMINI_API_KEY="your-google-gemini-key"
OPENROUTER_API_KEY="your-openrouter-key"
PORT=3000
```

### توسعه

```bash
npm run dev
```

در `http://localhost:3000` باز می‌شود.

### بیلد تولید

```bash
npm run build
npm run start
```

---

## اسکریپت‌ها

| دستور | توضیح |
|:--------|:------------|
| `npm run dev` | شروع سرور توسعه (Vite + Express) |
| `npm run build` | بیلد روپه‌ی رابط کاربری + دسته‌بندی سرور |
| `npm run start` | اجرای سرور تولید |
| `npm run clean` | حذف ساخت‌ها |
| `npm run lint` | اعتبارسنجی TypeScript |

---

## استقرار

### Vercel (روپه‌ی رابط کاربری)

درخواست‌های API از طریق `vercel.json` به پشتیبانی Cloud Run بازنویسی می‌شوند:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR_BACKEND_URL/api/$1" }
  ]
}
```

### Google Cloud Run (پشتیبانی)

سرور Express از طریق esbuild به `dist/server.cjs` کامپایل و به عنوان سرویس Node.js استقرار یافته است.

---

## امنیت

- احراز هویت JWT با انقضا توکن
- هش پسورد با bcrypt (۱۰ دور)
- محدودیت نرخ در حافظه (۳۰ درخواست/۶۰ث)
- به сво sanitization ورودی (میخواستن HTML، جلوگیری XSS)
- اعتبارسنجی regex ایمیل/نام کاربری

---

## مجوز

این پروژه تحت [مجوز MIT](LICENSE) منتشر شده است.

---

<div align="center" dir="rtl">

**محمد حسین اسدی** — مهندس فرانت‌اند و فرون‌اند کامل

[![کانال](https://img.shields.io/badge/GitHub-mohammadhossein--asadi-0a0a0a?style=flat-square&logo=github)](https://github.com/mohammadhossein-asadi)
[![لینکدین](https://img.shields.io/badge/لینکدین-mohammadhossein--asadi-0a66c2?style=flat-square&logo=linkedin)](https://linkedin.com/in/mohammadhossein-asadi)

</div>
