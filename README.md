<div align="center">

# Connectify

### Full-Stack Social Media Platform — Connect. Share. Spark Ideas with AI.

A production-grade social network built with React 19, Vite 6, Express, and JWT authentication — featuring Google Gemini AI content generation, OpenRouter-powered chatbot, stories, direct messaging, analytics, and 29+ REST API endpoints.

[![Live Demo](https://img.shields.io/badge/Live_Demo-connectify.ai-0a0a0a?style=for-the-badge&labelColor=0a0a0a&color=3b82f6)](https://connectify.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-0a0a0a?style=for-the-badge&labelColor=0a0a0a&color=22c55e)](#)

</div>

---

## Overview

Connectify is a feature-complete social media platform — not a prototype. It includes user authentication with JWT, a full post lifecycle (create, like, react, comment, share, bookmark), stories with image editing, direct messaging with an AI chatbot, analytics dashboards, notifications, and explore/discovery features.

The backend runs on Express with an in-memory JSON database, deployed to Google Cloud Run. The frontend is a Vite-powered SPA deployed on Vercel with API proxying to the backend.

---

## Features

| Feature | Description |
|:--------|:------------|
| **Authentication** | JWT-based registration, login, session persistence, demo accounts |
| **Social Feed** | Posts with rich text, image/video galleries, drag-drop media reordering |
| **Reactions & Comments** | Like, heart, fire, laugh reactions plus threaded comments |
| **Stories** | Create stories from images, videos, or text with filters and overlays |
| **Direct Messaging** | Real-time chat with typing indicators, read receipts, message search |
| **AI Chatbot** | OpenRouter-powered GeminiBot accessible via DM with verified badge |
| **AI Post Generation** | Google Gemini-powered post draft creation |
| **Explore & Discovery** | Trending hashtags, category browsing, user recommendations |
| **Analytics Dashboard** | Posts, followers, engagement scores, chart visualizations |
| **Notifications** | Like, comment, follow, message, system, verify, mention types |
| **Bookmarks** | Save and manage bookmarked posts |
| **User Profiles** | Bio, avatar, cover photo, website, location, verification system |
| **Dark/Light Theme** | Three-way toggle with system preference detection |
| **Responsive Layout** | Three-column desktop, single-column mobile with bottom nav |

---

## Tech Stack

| Layer | Technologies |
|:------|:-------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6.2 |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Motion (Framer Motion) 12 |
| **Backend** | Node.js, Express 4, JSON file persistence |
| **Auth** | JSON Web Tokens, bcryptjs |
| **AI** | Google Gemini, OpenRouter |
| **Icons** | Lucide React |
| **Fonts** | Inter, Space Grotesk |
| **Deployment** | Vercel (frontend) + Google Cloud Run (backend) |

---

## Project Structure

```
Connectify-NextJS/
├── src/
│   ├── components/
│   │   ├── Feed.tsx            # Main feed view
│   │   ├── Explore.tsx         # Discovery & trending
│   │   ├── Messages.tsx        # Direct messaging
│   │   ├── Notifications.tsx   # Notification center
│   │   ├── Profile.tsx         # User profiles
│   │   ├── Analytics.tsx       # Analytics dashboard
│   │   ├── Bookmarks.tsx       # Saved posts
│   │   ├── Settings.tsx        # Profile settings
│   │   ├── AuthModal.tsx       # Login/Register
│   │   ├── StoriesList.tsx     # Stories carousel
│   │   ├── StoriesModal.tsx    # Story viewer
│   │   ├── PostCreate.tsx      # Post creation
│   │   └── post/               # Post sub-components
│   ├── lib/
│   │   ├── api.ts              # Centralized API client
│   │   └── utils.ts            # Shared utilities
│   ├── App.tsx                 # Root routing
│   └── types.ts                # TypeScript interfaces
├── server.ts                   # Express backend (29+ endpoints)
├── db.json                     # In-memory database
├── vercel.json                 # Vercel deployment config
├── index.html                  # HTML shell with SEO meta
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## API Endpoints

| Route | Method | Purpose |
|:------|:-------|:--------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | Login (rate limited) |
| `/api/posts` | GET/POST | List/create posts |
| `/api/posts/:id/like` | POST | Like/unlike |
| `/api/posts/:id/react` | POST | Emoji reactions |
| `/api/posts/:id/comment` | POST | Add comment |
| `/api/stories` | GET/POST | List/create stories |
| `/api/messages` | GET/POST | Direct messaging |
| `/api/notifications` | GET | User notifications |
| `/api/users/recommendations` | GET | User suggestions |
| `/api/analytics` | GET | Analytics data |
| `/api/gemini/generate-post-draft` | POST | AI content generation |

*29+ endpoints total — see `server.ts` for full list.*

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Installation

```bash
git clone https://github.com/mohammadhossein-asadi/Connectify-NextJS.git
cd Connectify-NextJS
npm install
```

### Environment Configuration

Create a `.env` file (refer to `.env.example`):

```env
JWT_SECRET="your-jwt-secret"
GEMINI_API_KEY="your-google-gemini-key"
OPENROUTER_API_KEY="your-openrouter-key"
PORT=3000
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

---

## Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start dev server (Vite + Express) |
| `npm run build` | Build frontend + bundle server |
| `npm run start` | Run production server |
| `npm run clean` | Remove build artifacts |
| `npm run lint` | TypeScript type checking |

---

## Deployment

### Vercel (Frontend)

API requests are rewritten to the Cloud Run backend via `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR_BACKEND_URL/api/$1" }
  ]
}
```

### Google Cloud Run (Backend)

The Express server is compiled to `dist/server.cjs` via esbuild and deployed as a Node.js service.

---

## Security

- JWT authentication with token expiry
- Password hashing with bcrypt (10 rounds)
- In-memory rate limiting (30 req/60s)
- Input sanitization (HTML stripping, XSS prevention)
- Email/username regex validation

---

## Author

**Mohammadhossein Asadi** — Frontend & Full-Stack Engineer

[![GitHub](https://img.shields.io/badge/GitHub-mohammadhossein--asadi-0a0a0a?style=flat-square&logo=github)](https://github.com/mohammadhossein-asadi)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-mohammadhossein--asadi-0a66c2?style=flat-square&logo=linkedin)](https://linkedin.com/in/mohammadhossein-asadi)

---

## License

This project is licensed under the [MIT License](LICENSE).
