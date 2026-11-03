# Connectify-NextJS

<div align="center">

![Connectify Logo](public/logo.png)

**Modern Real-time Chat Application with AI Integration**

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Google GenAI](https://img.shields.io/badge/Google_GenAI-2.4-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[🇬🇧 English](#-connectify-nextjs) • [🇮🇷 فارسی](README.fa.md) • [📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

**Connectify** is a modern, full-stack real-time chat application built with **Vite + React 19 + Express**, featuring **AI-powered conversations** via Google GenAI, **JWT authentication**, and a beautiful **Tailwind CSS v4** interface.

### 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Real-time Messaging** | WebSocket-based instant messaging |
| **AI Chat Assistant** | Google GenAI integration for smart replies |
| **Authentication** | JWT-based auth with bcrypt password hashing |
| **Modern Stack** | Vite 6 + React 19 + Express + TypeScript |
| **Beautiful UI** | Tailwind CSS v4 + Lucide icons + Motion animations |
| **Server-side Rendering** | Vite + esbuild for production builds |

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + Vite | 19 / 6.2 |
| **Backend** | Express.js | 4.21 |
| **Language** | TypeScript | 5.8 |
| **Styling** | Tailwind CSS | 4.1 |
| **AI** | Google GenAI SDK | 2.4 |
| **Auth** | JWT + bcryptjs | 9.0 / 3.0 |
| **Build** | esbuild + Vite | 0.25 / 6.2 |
| **Animation** | Motion (Framer) | 12.23 |

### Project Structure

```
Connectify-NextJS/
├── public/                     # Static assets
├── src/
│   ├── client/                 # React frontend
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom hooks
│   │   ├── contexts/           # React contexts
│   │   ├── services/           # API services
│   │   ├── styles/             # CSS/Tailwind
│   │   └── main.tsx            # Entry point
│   ├── server/                 # Express backend
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Auth, validation
│   │   ├── services/           # Business logic
│   │   ├── socket/             # WebSocket handlers
│   │   └── server.ts           # Entry point
│   └── shared/                 # Shared types/constants
├── server.ts                   # Dev server (tsx)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+
- **npm** 10+
- **Google AI API Key** (for GenAI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/mohammadhossein-asadi/Connectify-NextJS.git
cd Connectify-NextJS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server (runs both client & server)
npm run dev
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Google GenAI
GOOGLE_GENAI_API_KEY=your-google-ai-api-key
GOOGLE_GENAI_MODEL=gemini-pro

# Database (optional - for persistence)
DATABASE_URL=postgresql://...

# CORS
CLIENT_URL=http://localhost:5173
```

### Development

```bash
# Start dev server (concurrent client + server)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check
npm run lint
```

---

## 🛠️ Development

### Available Commands

```bash
# Development
npm run dev          # Start dev server (tsx + Vite)
npm run build        # Production build (Vite + esbuild)
npm run start        # Start production server
npm run clean        # Clean dist folder

# Code Quality
npm run lint         # TypeScript type check
```

---

## 🧪 Testing

```bash
# Currently no test suite configured
# Add Vitest + React Testing Library for unit tests
# Add Playwright for E2E tests
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design |
| [API Reference](docs/API.md) | REST + WebSocket endpoints |
| [AI Integration](docs/AI_INTEGRATION.md) | GenAI prompt engineering |
| [Deployment](docs/DEPLOYMENT.md) | Production deployment guide |

---

## 🚀 Deployment

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t connectify .
docker run -p 3000:3000 --env-file .env.local connectify
```

### Vercel/Netlify (Frontend) + Railway/Render (Backend)

1. Deploy frontend to Vercel/Netlify
2. Deploy backend to Railway/Render
3. Update CORS and environment variables

---

## 🔒 Security

- **JWT tokens** with secure httpOnly cookies
- **bcrypt** password hashing (12 rounds)
- **Input validation** on all API routes
- **CORS** configured for specific origins
- **Rate limiting** on auth endpoints
- **Helmet.js** security headers (planned)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) first.

---

## 📋 Roadmap

### ✅ Completed

- [x] Vite + React 19 + Express setup
- [x] JWT authentication
- [x] Real-time WebSocket messaging
- [x] Google GenAI integration
- [x] Tailwind CSS v4 styling

### 🔄 In Progress

- [ ] Message persistence (database)
- [ ] File/image sharing
- [ ] Group chats
- [ ] Message reactions
- [ ] Push notifications

### 📅 Planned

- [ ] End-to-end encryption
- [ ] Voice/video calls (WebRTC)
- [ ] Mobile app (React Native)
- [ ] Bot framework

---

## 📄 License

**MIT License** — See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Vite** — Next-generation frontend tooling
- **React** — UI library by Meta
- **Express** — Fast, minimalist web framework
- **Google GenAI** — Generative AI by Google
- **Tailwind CSS** — Utility-first CSS framework
- **Motion** — Animation library by Framer

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/mohammadhossein-asadi/Connectify-NextJS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mohammadhossein-asadi/Connectify-NextJS/discussions)

---

<div align="center">

**Built with ❤️ for real-time communication enthusiasts**

[🇬🇧 English](README.md) • [🇮🇷 فارسی](README.fa.md) • [⭐ Star us on GitHub](https://github.com/mohammadhossein-asadi/Connectify-NextJS)

</div>