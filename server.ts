import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import net from "net";
import path from "path";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  Comment,
  HashtagTrend,
  Message,
  Notification,
  Post,
  Story,
  User,
} from "./src/types";

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || "connectify-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 10;

// Input sanitization helpers
function sanitizeString(input: string, maxLength: number = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // strip JS protocol
    .replace(/on\w+=/gi, "") // strip event handlers
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Auth middleware - extracts userId from JWT token
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.authUserId = payload.userId;
  next();
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(windowMs: number = 60000, maxRequests: number = 30) {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

// Strip password from user object before sending to client
function sanitizeUser(user: User): Omit<User, "password"> {
  const { password, ...safeUser } = user;
  return safeUser;
}

function sanitizeUsers(users: User[]): Omit<User, "password">[] {
  return users.map(sanitizeUser);
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// CORS middleware - restrict to known origins
const ALLOWED_ORIGINS = [
  process.env.APP_URL || "",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Global rate limiter
app.use(rateLimit(60000, 60));

// Increase body size limit to support image/video base64 uploads
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Path for JSON-backed simple database backup
const DB_FILE = path.join(process.cwd(), "db.json");

// Define OpenRouter Client configuration (must be provided via environment)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
if (process.env.OPENROUTER_API_KEY) {
  console.log("OpenRouter API key is configured via environment variables.");
} else {
  console.warn(
    "OpenRouter API key not set. OpenRouter features will be disabled.",
  );
}

// Initial Database State
let users: User[] = [];
let posts: Post[] = [];
let stories: Story[] = [];
let notifications: Notification[] = [];
let messages: Message[] = [];

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Static Asset Mocking & Seed Data
const GEMINI_BOT_ID = "gemini-bot";

const SEED_USERS: User[] = [
  {
    id: GEMINI_BOT_ID,
    email: "bot@openrouter.ai",
    username: "OpenRouterBot",
    bio: "Official AI Assistant for Connectify. Powered by OpenRouter (openrouter/free). DM me to chat or mention me in a post to get a creative summary!",
    avatar:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    cover:
      "https://images.unsplash.com/photo-1618005198143-e528346d285e?w=800&auto=format&fit=crop&q=80",
    followers: ["user-1", "user-2"],
    following: [],
    verified: true,
    website: "ai.studio",
    location: "Google DeepMind Cloud",
    bookmarks: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "user-1",
    email: "sarah@connectify.com",
    username: "SarahJenkins",
    bio: "Product Designer & Travel Enthusiast. Curating beautiful interfaces and global adventures. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    cover:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    followers: ["user-2", GEMINI_BOT_ID],
    following: ["user-2", GEMINI_BOT_ID],
    verified: true,
    website: "sarahj.design",
    location: "San Francisco, CA",
    bookmarks: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "user-2",
    email: "alex@connectify.com",
    username: "AlexRivera",
    bio: "Full Stack Engineer | React & Node specialist. Building the next generation of web applications. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    cover:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
    followers: ["user-1"],
    following: ["user-1", GEMINI_BOT_ID],
    verified: false,
    website: "alexrivera.dev",
    location: "Austin, TX",
    bookmarks: [],
    createdAt: new Date().toISOString(),
  },
];

const SEED_POSTS: Post[] = [
  {
    id: "post-1",
    userId: "user-1",
    username: "SarahJenkins",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    userVerified: true,
    content:
      "Just landed in Kyoto! The serene moss gardens and golden temples are absolutely breathtaking. Looking forward to exploring local artisan shops this week. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ #Kyoto #TravelDiary #Inspiration",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80",
    likes: ["user-2", GEMINI_BOT_ID],
    reactions: {
      like: ["user-2", GEMINI_BOT_ID],
      heart: [],
      fire: [],
      laugh: [],
    },
    comments: [
      {
        id: "comment-1",
        postId: "post-1",
        userId: "user-2",
        username: "AlexRivera",
        userAvatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        content:
          "Wow Sarah, this shot is incredible! Have an amazing time there, can't wait to see more photos.",
        likes: ["user-1"],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "comment-2",
        postId: "post-1",
        userId: GEMINI_BOT_ID,
        username: "GeminiBot",
        userAvatar:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        content:
          "Kyoto is highly renowned for its perfectly preserved temples and peaceful rock gardens. If you have time, try visiting Arashiyama Bamboo Grove early in the morning for a tranquil walk!",
        likes: ["user-1", "user-2"],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
    shares: 4,
    hashtags: ["Kyoto", "TravelDiary", "Inspiration"],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "post-2",
    userId: "user-2",
    username: "AlexRivera",
    userAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    userVerified: false,
    content:
      "Excited to launch the brand new Tailwind CSS v4 template! It is lightning fast and works seamlessly with Vite. Check out how modular and clean the global design is. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â» #WebDev #TailwindCSS #Coding",
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    likes: ["user-1"],
    reactions: {
      like: ["user-1"],
      heart: [],
      fire: [],
      laugh: [],
    },
    comments: [
      {
        id: "comment-3",
        postId: "post-2",
        userId: "user-1",
        username: "SarahJenkins",
        userAvatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        content:
          "Tailwind v4 is a complete game changer! The CSS-first configuration and faster compile speeds are amazing.",
        likes: ["user-2"],
        createdAt: new Date(Date.now() - 1200000).toISOString(),
      },
    ],
    shares: 2,
    hashtags: ["WebDev", "TailwindCSS", "Coding"],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

const SEED_STORIES: Story[] = [
  {
    id: "story-1",
    userId: "user-1",
    username: "SarahJenkins",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "story-2",
    userId: "user-2",
    username: "AlexRivera",
    userAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    userId: "user-1",
    type: "like",
    relatedUserId: "user-2",
    relatedUsername: "AlexRivera",
    relatedUserAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    relatedPostId: "post-1",
    content: "liked your post.",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "notif-2",
    userId: "user-1",
    type: "comment",
    relatedUserId: "user-2",
    relatedUsername: "AlexRivera",
    relatedUserAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    relatedPostId: "post-1",
    content: "commented: 'Wow Sarah, this shot is incredible!...'",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const SEED_MESSAGES: Message[] = [
  {
    id: "msg-1",
    senderId: "user-1",
    recipientId: "user-2",
    content:
      "Hey Alex! Have you had a chance to look at the design system specs?",
    read: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "msg-2",
    senderId: "user-2",
    recipientId: "user-1",
    content:
      "Yes Sarah! They look incredible. I really love the spaciousness and typography hierarchy.",
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg-3",
    senderId: "user-1",
    recipientId: "user-2",
    content: "Awesome, thank you! I'll prepare the responsive grids tomorrow.",
    read: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Load database or seed initial values
const loadDatabase = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      users = data.users || SEED_USERS;
      // Force update gemini-bot user info if it is stale
      const botIdx = users.findIndex((u) => u.id === GEMINI_BOT_ID);
      if (botIdx !== -1) {
        users[botIdx] = {
          ...users[botIdx],
          username: "OpenRouterBot",
          email: "bot@openrouter.ai",
          bio: "Official AI Assistant for Connectify. Powered by OpenRouter (openrouter/free). DM me to chat or mention me in a post to get a creative summary!",
        };
      }
      posts = data.posts || SEED_POSTS;
      stories = data.stories || SEED_STORIES;
      notifications = data.notifications || SEED_NOTIFICATIONS;
      messages = data.messages || SEED_MESSAGES;
      console.log("Database loaded successfully from file storage.");
    } else {
      users = [...SEED_USERS];
      posts = [...SEED_POSTS];
      stories = [...SEED_STORIES];
      notifications = [...SEED_NOTIFICATIONS];
      messages = [...SEED_MESSAGES];
      saveDatabase();
      console.log("Database seeded with high-quality mock profiles and posts.");
    }
  } catch (error) {
    console.error("Error loading database:", error);
    users = [...SEED_USERS];
    posts = [...SEED_POSTS];
    stories = [...SEED_STORIES];
    notifications = [...SEED_NOTIFICATIONS];
    messages = [...SEED_MESSAGES];
  }
};

const saveDatabase = () => {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(
        { users, posts, stories, notifications, messages },
        null,
        2,
      ),
      "utf-8",
    );
  } catch (error) {
    console.error("Error saving database:", error);
  }
};

loadDatabase();

// Clean up expired stories interval
setInterval(() => {
  const originalLength = stories.length;
  const now = new Date();
  stories = stories.filter((s) => new Date(s.expiresAt) > now);
  if (stories.length !== originalLength) {
    saveDatabase();
    console.log("Expired stories cleaned up.");
  }
}, 60000);

// OpenRouter helper function
async function generateBotResponse(promptText: string): Promise<string> {
  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    const genericReplies = [
      "That is super interesting! Tell me more about it.",
      "Indeed! The social space is evolving so rapidly.",
      "Fascinating perspective! Thanks for sharing this with the community.",
      "As an AI, I completely appreciate this thought! Great job. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨",
      "Connectify is truly the place to share these insights!",
      "I absolutely agree. Let me know if you want me to write a comprehensive post about it!",
    ];
    return genericReplies[Math.floor(Math.random() * genericReplies.length)];
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://connectify.ai",
          "X-Title": "Connectify",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are 'AIBot' (formerly GeminiBot), the friendly, creative, witty AI social media bot on the Connectify platform. Keep your responses casual, conversational, engaging, and under 50 words. Add relevant emojis.",
            },
            {
              role: "user",
              content: promptText,
            },
          ],
          temperature: 0.85,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return content ? content.trim() : "Fascinating! ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸";
  } catch (error) {
    console.error("Error generating OpenRouter content for bot reply:", error);
    return "Wow, that sounds great! ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬";
  }
}

// ---------------- REST API ROUTES ----------------

// 1. AUTHENTICATION
app.post("/api/auth/register", (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const cleanUsername = username.replace(/\s+/g, "");
  const existingUser = users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() ||
      u.username.toLowerCase() === cleanUsername.toLowerCase(),
  );

  if (existingUser) {
    return res
      .status(400)
      .json({ error: "Username or Email already registered" });
  }

  const newUser: User = {
    id: "user-" + generateId(),
    email: email.toLowerCase(),
    username: cleanUsername,
    bio: `Hey there! I am ${cleanUsername}, a proud member of Connectify.`,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    cover: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`,
    followers: [],
    following: [GEMINI_BOT_ID], // Auto follow GeminiBot
    verified: false,
    bookmarks: [],
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveDatabase();

  // Create welcome notification
  notifications.push({
    id: "notif-" + generateId(),
    userId: newUser.id,
    type: "system",
    content:
      "Welcome to Connectify! Start exploring the feed, saving posts, and DMing GeminiBot for premium AI responses.",
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDatabase();

  res
    .status(201)
    .json({ user: sanitizeUser(newUser), token: generateToken(newUser.id) });
});

app.post("/api/auth/login", rateLimit(60000, 20), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const cleanEmail = sanitizeString(email.toLowerCase(), 254);

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      u.username.toLowerCase() === cleanEmail,
  );
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Verify password against hash
  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  }

  res.status(200).json({ user: sanitizeUser(user), token: generateToken(user.id) });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid session token" });
  }
  const user = users.find((u) => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  res.status(200).json({ user: sanitizeUser(user) });
});

// 2. USERS & PROFILES
app.get("/api/users", (req, res) => {
  res
    .status(200)
    .json(
      sanitizeUsers(users).map((u) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        verified: u.verified,
        bio: u.bio,
      })),
    );
});

app.get("/api/users/recommendations", (req, res) => {
  const userId = req.query.userId as string;
  // Recommend users that are NOT the current user and whom the current user is NOT following
  const currentUser = users.find((u) => u.id === userId);
  let suggestions = users.filter((u) => u.id !== userId);
  if (currentUser) {
    suggestions = suggestions.filter(
      (u) => !currentUser.following.includes(u.id),
    );
  }
  res.status(200).json(suggestions.slice(0, 5));
});

app.get("/api/users/:userId", (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.status(200).json(sanitizeUser(user));
});

app.post("/api/users/profile", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  const { bio, website, location, avatar, cover } = req.body;
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedUser = {
    ...users[userIndex],
    bio: bio !== undefined ? sanitizeString(bio, 500) : users[userIndex].bio,
    website: website !== undefined ? sanitizeString(website, 200) : users[userIndex].website,
    location: location !== undefined ? sanitizeString(location, 100) : users[userIndex].location,
    avatar: avatar !== undefined ? sanitizeString(avatar, 2000) : users[userIndex].avatar,
    cover: cover !== undefined ? sanitizeString(cover, 2000) : users[userIndex].cover,
  };

  users[userIndex] = updatedUser;
  saveDatabase();

  // Update details in existing posts and comments so everything propagates
  posts = posts.map((p) => {
    if (p.userId === userId) {
      return { ...p, userAvatar: updatedUser.avatar };
    }
    return {
      ...p,
      comments: p.comments.map((c) =>
        c.userId === userId ? { ...c, userAvatar: updatedUser.avatar } : c,
      ),
    };
  });
  saveDatabase();

  res.status(200).json(updatedUser);
});

app.post("/api/users/:targetUserId/follow", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  const { targetUserId } = req.params;

  if (userId === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const userIndex = users.findIndex((u) => u.id === userId);
  const targetIndex = users.findIndex((u) => u.id === targetUserId);

  if (userIndex === -1 || targetIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = users[userIndex];
  const targetUser = users[targetIndex];

  const isFollowing = user.following.includes(targetUserId);

  if (isFollowing) {
    // Unfollow
    user.following = user.following.filter((id) => id !== targetUserId);
    targetUser.followers = targetUser.followers.filter((id) => id !== userId);
  } else {
    // Follow
    user.following.push(targetUserId);
    targetUser.followers.push(userId);

    // Create follow notification
    notifications.push({
      id: "notif-" + generateId(),
      userId: targetUserId,
      type: "follow",
      relatedUserId: userId,
      relatedUsername: user.username,
      relatedUserAvatar: user.avatar,
      content: "started following you.",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDatabase();
  res.status(200).json({ user: sanitizeUser(user), targetUser: sanitizeUser(targetUser), isFollowing: !isFollowing });
});

// Verification badges request simulation
app.post("/api/users/:userId/request-verification", authMiddleware, (req: any, res) => {
  const userIndex = users.findIndex((u) => u.id === req.params.userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  users[userIndex].verified = true;
  saveDatabase();

  // Propagation in existing posts
  posts = posts.map((p) =>
    p.userId === req.params.userId ? { ...p, userVerified: true } : p,
  );
  saveDatabase();

  notifications.push({
    id: "notif-" + generateId(),
    userId: req.params.userId,
    type: "verify",
    content:
      "Congratulations! Your profile has been officially verified with a blue checkmark badge. ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â",
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDatabase();

  res.status(200).json(users[userIndex]);
});

// 3. POSTS
app.get("/api/posts", (req, res) => {
  const {
    search,
    tag,
    userId,
    bookmarkedBy,
    filter,
    currentUserId,
    scheduledOnly,
  } = req.query;
  let result = [...posts];

  // Scheduled posts logic
  if (scheduledOnly === "true") {
    if (userId) {
      result = result.filter(
        (p) =>
          p.userId === userId &&
          p.scheduledAt &&
          new Date(p.scheduledAt).getTime() > Date.now(),
      );
    } else {
      result = [];
    }
  } else {
    result = result.filter(
      (p) => !p.scheduledAt || new Date(p.scheduledAt).getTime() <= Date.now(),
    );
  }

  // User filter
  if (userId && scheduledOnly !== "true") {
    result = result.filter((p) => p.userId === userId);
  }

  // Bookmarks filter
  if (bookmarkedBy) {
    const user = users.find((u) => u.id === bookmarkedBy);
    if (user) {
      result = result.filter((p) => user.bookmarks.includes(p.id));
    } else {
      result = [];
    }
  }

  // Following filter (only posts by users currentUserId is following, plus their own posts)
  if (filter === "following" && currentUserId) {
    const user = users.find((u) => u.id === currentUserId);
    if (user) {
      result = result.filter(
        (p) => user.following.includes(p.userId) || p.userId === currentUserId,
      );
    } else {
      result = [];
    }
  }

  // Tag filter
  if (tag) {
    result = result.filter((p) =>
      p.hashtags.some((h) => h.toLowerCase() === (tag as string).toLowerCase()),
    );
  }

  // Search filter
  if (search) {
    const query = (search as string).toLowerCase();
    result = result.filter(
      (p) =>
        p.content.toLowerCase().includes(query) ||
        p.username.toLowerCase().includes(query) ||
        p.hashtags.some((h) => h.toLowerCase().includes(query)),
    );
  }

  // Advanced Engagement & Date Filters
  if (filter === "trending" || filter === "popular") {
    // Sort by likes count + comments count desc
    result.sort(
      (a, b) =>
        b.likes.length +
        b.comments.length -
        (a.likes.length + a.comments.length),
    );
  } else if (filter === "oldest") {
    result.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  } else {
    // Latest / default
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  // Strictly enforce post visibility rules
  const viewerId = (currentUserId || bookmarkedBy || userId) as
    | string
    | undefined;
  result = result.filter((p) => {
    const visibility = p.visibility || "public";
    if (visibility === "public") {
      return true;
    }
    if (!viewerId) {
      return false; // Hide non-public posts for unauthenticated/anonymous viewing
    }
    if (p.userId === viewerId) {
      return true; // Author can always view their own posts
    }
    if (visibility === "private") {
      return false; // Only author can see private posts
    }
    if (visibility === "followers") {
      const author = users.find((u) => u.id === p.userId);
      if (author && author.followers && author.followers.includes(viewerId)) {
        return true; // Followers can see followers-only posts
      }
      return false;
    }
    return true;
  });

  res.status(200).json(result);
});

app.get("/api/hashtags/trending", (req, res) => {
  const counts: Record<string, number> = {};
  posts.forEach((post) => {
    // Only count hashtags of published posts
    const isPublished =
      !post.scheduledAt || new Date(post.scheduledAt).getTime() <= Date.now();
    if (isPublished && post.hashtags && Array.isArray(post.hashtags)) {
      post.hashtags.forEach((tag) => {
        const cleaned = tag.replace(/^#/, "").trim();
        if (cleaned) {
          counts[cleaned] = (counts[cleaned] || 0) + 1;
        }
      });
    }
  });

  const trending = Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.status(200).json(trending);
});

app.post("/api/posts", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  const {
    content,
    image,
    video,
    images,
    media,
    scheduledAt,
    poll,
    visibility,
  } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (
    !content &&
    !image &&
    !video &&
    (!images || images.length === 0) &&
    (!media || media.length === 0) &&
    !poll
  ) {
    return res.status(400).json({ error: "Post cannot be empty" });
  }

  // Extract hashtags
  const hashtags: string[] = [];
  if (content) {
    const matches = content.match(/#(\w+)/g);
    if (matches) {
      matches.forEach((m: string) => {
        const tag = m.substring(1);
        if (!hashtags.includes(tag)) {
          hashtags.push(tag);
        }
      });
    }
  }

  const newPost: Post = {
    id: "post-" + generateId(),
    userId,
    username: user.username,
    userAvatar: user.avatar,
    userVerified: user.verified,
    content: content ? sanitizeString(content, 2200) : "",
    image,
    video,
    images: images || [],
    media: media || [],
    likes: [],
    reactions: {
      like: [],
      heart: [],
      fire: [],
      laugh: [],
    },
    comments: [],
    shares: 0,
    hashtags,
    createdAt: new Date().toISOString(),
    scheduledAt: scheduledAt || undefined,
    poll: poll || undefined,
    visibility: visibility || "public",
  };

  posts.push(newPost);
  saveDatabase();

  // Parse @mentions for notification triggers
  const mentionMatches = content.match(/@(\w+)/g);
  if (mentionMatches) {
    mentionMatches.forEach((m: string) => {
      const usernameToFind = m.substring(1);
      const mentionedUser = users.find(
        (u) => u.username.toLowerCase() === usernameToFind.toLowerCase(),
      );
      if (mentionedUser && mentionedUser.id !== userId) {
        notifications.push({
          id: "notif-" + generateId(),
          userId: mentionedUser.id,
          type: "mention",
          relatedUserId: userId,
          relatedUsername: user.username,
          relatedUserAvatar: user.avatar,
          relatedPostId: newPost.id,
          content: `mentioned you in a post: "${content.substring(0, 35)}..."`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    saveDatabase();
  }

  // Moderate content/auto tag / auto respond by GeminiBot if mentioned
  const isBotMentioned =
    content.toLowerCase().includes("@geminibot") ||
    content.toLowerCase().includes("gemini");

  if (isBotMentioned) {
    setTimeout(async () => {
      const prompt = `React to this post written by @${user.username} on Connectify: "${content}". Write a supportive, engaging reply.`;
      const botReply = await generateBotResponse(prompt);

      const botComment: Comment = {
        id: "comment-" + generateId(),
        postId: newPost.id,
        userId: GEMINI_BOT_ID,
        username: "GeminiBot",
        userAvatar:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        content: botReply,
        likes: [],
        createdAt: new Date().toISOString(),
      };

      // Add to post
      const freshPostIndex = posts.findIndex((p) => p.id === newPost.id);
      if (freshPostIndex !== -1) {
        posts[freshPostIndex].comments.push(botComment);
        saveDatabase();

        // Notify user about bot's comment
        notifications.push({
          id: "notif-" + generateId(),
          userId: userId,
          type: "comment",
          relatedUserId: GEMINI_BOT_ID,
          relatedUsername: "GeminiBot",
          relatedUserAvatar:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
          relatedPostId: newPost.id,
          content: `commented: "${botReply.substring(0, 40)}..."`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        saveDatabase();
      }
    }, 2000);
  }

  res.status(201).json(newPost);
});

app.delete("/api/posts/:postId", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const userId = req.authUserId;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  // Ensure authorization
  if (posts[postIndex].userId !== userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  posts.splice(postIndex, 1);
  saveDatabase();
  res.status(200).json({ success: true });
});

app.post("/api/posts/:postId/like", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const userId = req.authUserId;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = posts[postIndex];
  const user = users.find((u) => u.id === userId);
  const isLiked = post.likes.includes(userId);

  if (!post.reactions) {
    post.reactions = {
      like: [],
      heart: [],
      fire: [],
      laugh: [],
    };
  }

  if (isLiked) {
    // Unlike
    post.likes = post.likes.filter((id) => id !== userId);
    post.reactions.like = post.reactions.like.filter((id) => id !== userId);
  } else {
    // Like
    post.likes.push(userId);
    if (!post.reactions.like.includes(userId)) {
      post.reactions.like.push(userId);
    }

    // Notify post owner
    if (post.userId !== userId && user) {
      notifications.push({
        id: "notif-" + generateId(),
        userId: post.userId,
        type: "like",
        relatedUserId: userId,
        relatedUsername: user.username,
        relatedUserAvatar: user.avatar,
        relatedPostId: postId,
        content: "liked your post.",
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  saveDatabase();
  res.status(200).json(post);
});

app.post("/api/posts/:postId/react", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const { reactionType } = req.body;
  const userId = req.authUserId;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = posts[postIndex];
  const user = users.find((u) => u.id === userId);

  if (!post.reactions) {
    post.reactions = {
      like: [],
      heart: [],
      fire: [],
      laugh: [],
    };
  }

  const rType = reactionType as "like" | "heart" | "fire" | "laugh";
  if (!post.reactions[rType]) {
    post.reactions[rType] = [];
  }

  const hasReacted = post.reactions[rType].includes(userId);

  if (hasReacted) {
    post.reactions[rType] = post.reactions[rType].filter((id) => id !== userId);
  } else {
    post.reactions[rType].push(userId);

    // Notify post owner
    if (post.userId !== userId && user) {
      let reactionEmoji = "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â";
      if (rType === "heart") reactionEmoji = "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â";
      else if (rType === "fire") reactionEmoji = "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥";
      else if (rType === "laugh") reactionEmoji = "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡";

      notifications.push({
        id: "notif-" + generateId(),
        userId: post.userId,
        type: "like",
        relatedUserId: userId,
        relatedUsername: user.username,
        relatedUserAvatar: user.avatar,
        relatedPostId: postId,
        content: `reacted to your post with ${reactionEmoji}.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Sync likes array with reactions.like
  post.likes = [...post.reactions.like];

  saveDatabase();
  res.status(200).json(post);
});

app.post("/api/posts/:postId/poll/vote", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const { optionId } = req.body;
  const userId = req.authUserId;

  if (!optionId || !userId) {
    return res.status(400).json({ error: "Missing optionId or userId" });
  }

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const post = posts[postIndex];
  if (!post.poll) {
    return res.status(400).json({ error: "Post does not contain a poll" });
  }

  // Check if option exists
  const optionIndex = post.poll.options.findIndex((opt) => opt.id === optionId);
  if (optionIndex === -1) {
    return res.status(404).json({ error: "Poll option not found" });
  }

  // Remove this user's vote from any other option in this poll (exclusivity: one vote per user)
  post.poll.options.forEach((opt) => {
    if (!opt.votes) opt.votes = [];
    opt.votes = opt.votes.filter((id) => id !== userId);
  });

  // Add the vote to the chosen option
  post.poll.options[optionIndex].votes.push(userId);

  saveDatabase();
  res.status(200).json(post);
});

app.post("/api/posts/:postId/comment", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.authUserId;

  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const newComment: Comment = {
    id: "comment-" + generateId(),
    postId,
    userId,
    username: user.username,
    userAvatar: user.avatar,
    content: sanitizeString(content, 1000),
    likes: [],
    createdAt: new Date().toISOString(),
  };

  posts[postIndex].comments.push(newComment);
  saveDatabase();

  // Notify post owner
  if (posts[postIndex].userId !== userId) {
    notifications.push({
      id: "notif-" + generateId(),
      userId: posts[postIndex].userId,
      type: "comment",
      relatedUserId: userId,
      relatedUsername: user.username,
      relatedUserAvatar: user.avatar,
      relatedPostId: postId,
      content: `commented: "${content.substring(0, 40)}..."`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDatabase();
  }

  res.status(201).json(posts[postIndex]);
});

app.post("/api/posts/:postId/share", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: "Post not found" });
  }

  posts[postIndex].shares += 1;
  saveDatabase();
  res.status(200).json(posts[postIndex]);
});

app.post("/api/posts/:postId/bookmark", authMiddleware, (req: any, res) => {
  const { postId } = req.params;
  const userId = req.authUserId;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = users[userIndex];
  const isBookmarked = user.bookmarks.includes(postId);

  if (isBookmarked) {
    user.bookmarks = user.bookmarks.filter((id) => id !== postId);
  } else {
    user.bookmarks.push(postId);
  }

  saveDatabase();
  res
    .status(200)
    .json({ bookmarks: user.bookmarks, isBookmarked: !isBookmarked });
});

// 4. STORIES
app.get("/api/stories", (req, res) => {
  // Only return active stories (created within 24 hours, checked in setInterval but also here)
  const now = new Date();
  const activeStories = stories.filter((s) => new Date(s.expiresAt) > now);
  res.status(200).json(activeStories);
});

app.post("/api/stories", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  const { image } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!image) {
    return res.status(400).json({ error: "Story requires an image" });
  }

  const newStory: Story = {
    id: "story-" + generateId(),
    userId,
    username: user.username,
    userAvatar: user.avatar,
    image: sanitizeString(image, 10000),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
  };

  stories.push(newStory);
  saveDatabase();

  res.status(201).json(newStory);
});

app.delete("/api/stories/:storyId", authMiddleware, (req: any, res) => {
  const { storyId } = req.params;
  const userId = req.authUserId;

  const storyIndex = stories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) {
    return res.status(404).json({ error: "Story not found" });
  }

  if (stories[storyIndex].userId !== userId) {
    return res.status(403).json({ error: "Unauthorized to delete this story" });
  }

  stories.splice(storyIndex, 1);
  saveDatabase();
  res.status(200).json({ success: true, message: "Story deleted" });
});

app.post("/api/stories/:storyId/react", authMiddleware, (req: any, res) => {
  const { storyId } = req.params;
  const { emoji } = req.body;
  const userId = req.authUserId;

  if (!userId || !emoji) {
    return res.status(400).json({ error: "Missing userId or emoji" });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const storyIndex = stories.findIndex((s) => s.id === storyId);
  if (storyIndex === -1) {
    return res.status(404).json({ error: "Story not found" });
  }

  const story = stories[storyIndex];
  if (!story.reactions) {
    story.reactions = [];
  }

  // Toggle reaction: check if this user has already reacted with the exact same emoji
  const existingIdx = story.reactions.findIndex(
    (r) => r.userId === userId && r.emoji === emoji,
  );
  if (existingIdx !== -1) {
    story.reactions.splice(existingIdx, 1);
  } else {
    story.reactions.push({
      id: "react-" + generateId(),
      emoji,
      userId,
      username: user.username,
    });
  }

  saveDatabase();
  res.status(200).json(story);
});

// 5. MESSAGES & REALTIME CHAT
app.get("/api/messages", (req, res) => {
  const { senderId, recipientId } = req.query;
  if (!senderId || !recipientId) {
    return res
      .status(400)
      .json({ error: "Sender and recipient IDs are required" });
  }

  // Mark messages sent by recipientId to senderId as read (requester has read them)
  // Also, any message sent to GeminiBot is read instantly
  let stateChanged = false;
  messages.forEach((m) => {
    if (m.senderId === recipientId && m.recipientId === senderId && !m.read) {
      m.read = true;
      stateChanged = true;
    }
    if (m.senderId === senderId && m.recipientId === "gemini-bot" && !m.read) {
      m.read = true;
      stateChanged = true;
    }
  });

  if (stateChanged) {
    saveDatabase();
  }

  const conversation = messages
    .filter(
      (m) =>
        (m.senderId === senderId && m.recipientId === recipientId) ||
        (m.senderId === recipientId && m.recipientId === senderId),
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  res.status(200).json(conversation);
});

app.post("/api/messages/read", (req, res) => {
  const { senderId, recipientId } = req.body;
  if (!senderId || !recipientId) {
    return res
      .status(400)
      .json({ error: "Sender and recipient IDs are required" });
  }

  let stateChanged = false;
  messages.forEach((m) => {
    if (m.senderId === recipientId && m.recipientId === senderId && !m.read) {
      m.read = true;
      stateChanged = true;
    }
  });

  if (stateChanged) {
    saveDatabase();
  }

  res.status(200).json({ success: true });
});

app.post("/api/messages", async (req, res) => {
  const { senderId, recipientId, content } = req.body;
  if (!senderId || !recipientId || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newMessage: Message = {
    id: "msg-" + generateId(),
    senderId,
    recipientId,
    content: sanitizeString(content, 2000),
    read: false,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  saveDatabase();

  // If receiving message is GeminiBot, auto-reply with a realistic typing delay
  if (recipientId === GEMINI_BOT_ID) {
    // Retrieve conversation history for context
    const convo = messages
      .filter(
        (m) =>
          (m.senderId === senderId && m.recipientId === GEMINI_BOT_ID) ||
          (m.senderId === GEMINI_BOT_ID && m.recipientId === senderId),
      )
      .slice(-10); // Last 10 messages

    const senderUser = users.find((u) => u.id === senderId);

    setTimeout(async () => {
      const contextPrompt =
        convo
          .map(
            (m) =>
              `@${m.senderId === GEMINI_BOT_ID ? "GeminiBot" : senderUser?.username || "User"}: ${m.content}`,
          )
          .join("\n") + `\n\nWrite @GeminiBot's direct message response.`;
      const botResponse = await generateBotResponse(contextPrompt);

      const botMessage: Message = {
        id: "msg-" + generateId(),
        senderId: GEMINI_BOT_ID,
        recipientId: senderId,
        content: botResponse,
        read: false,
        createdAt: new Date().toISOString(),
      };

      messages.push(botMessage);

      // Also trigger notification for user
      notifications.push({
        id: "notif-" + generateId(),
        userId: senderId,
        type: "message",
        relatedUserId: GEMINI_BOT_ID,
        relatedUsername: "GeminiBot",
        relatedUserAvatar:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        content: `sent you a direct message: "${botResponse.substring(0, 30)}..."`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveDatabase();
    }, 1500);
  } else {
    // Normal message notification
    const sender = users.find((u) => u.id === senderId);
    if (sender) {
      notifications.push({
        id: "notif-" + generateId(),
        userId: recipientId,
        type: "message",
        relatedUserId: senderId,
        relatedUsername: sender.username,
        relatedUserAvatar: sender.avatar,
        content: `sent you a message: "${content.substring(0, 30)}..."`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      saveDatabase();
    }
  }

  res.status(201).json(newMessage);
});

// 6. NOTIFICATIONS
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const userNotifs = notifications
    .filter((n) => n.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  res.status(200).json(userNotifs);
});

app.post("/api/notifications/read", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  const { notificationId } = req.body;
  if (notificationId) {
    const notif = notifications.find(
      (n) => n.id === notificationId && n.userId === userId,
    );
    if (notif) {
      notif.read = true;
    }
  } else {
    // Mark all as read
    notifications = notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n,
    );
  }
  saveDatabase();
  res.status(200).json({ success: true });
});

// Clear notifications
app.post("/api/notifications/clear", authMiddleware, (req: any, res) => {
  const userId = req.authUserId;
  notifications = notifications.filter((n) => n.userId !== userId);
  saveDatabase();
  res.status(200).json({ success: true });
});

// 7. HASHTAGS & TRENDING
app.get("/api/hashtags/trending", (req, res) => {
  const tagCounts: { [key: string]: number } = {};

  posts.forEach((p) => {
    p.hashtags.forEach((h) => {
      const normalized = h.toLowerCase();
      tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
    });
  });

  // Convert to trend format, sort, and seed some default trends if empty
  const trends: HashtagTrend[] = Object.keys(tagCounts)
    .map((tag) => ({
      tag,
      count: tagCounts[tag],
    }))
    .sort((a, b) => b.count - a.count);

  // Fill up if low
  const defaultTrends = [
    { tag: "Connectify", count: 12 },
    { tag: "AIStudio", count: 8 },
    { tag: "TailwindCSS", count: 7 },
    { tag: "WebDev", count: 5 },
    { tag: "Kyoto", count: 3 },
  ];

  defaultTrends.forEach((d) => {
    if (!trends.find((t) => t.tag.toLowerCase() === d.tag.toLowerCase())) {
      trends.push(d);
    }
  });

  res.status(200).json(trends.slice(0, 10));
});

// 8. FILE UPLOAD (MOCK INTEGRATION)
app.post("/api/upload", (req, res) => {
  const { fileData, fileName, fileType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "No file content provided" });
  }

  // FileData is already base64/dataURL, so we can just return it.
  // It provides high reliability as it requires zero server files storage configs
  // and stays beautifully embedded within memory db records!
  res.status(200).json({ fileUrl: fileData });
});

// 9. ANALYTICS
app.get("/api/analytics", (req, res) => {
  const { userId } = req.query;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const userPosts = posts.filter((p) => p.userId === userId);
  const totalLikes = userPosts.reduce((acc, p) => acc + p.likes.length, 0);
  const totalComments = userPosts.reduce(
    (acc, p) => acc + p.comments.length,
    0,
  );
  const totalShares = userPosts.reduce((acc, p) => acc + p.shares, 0);

  // Weekly interaction mock data
  const chartData = [
    {
      name: "Mon",
      likes: Math.round(totalLikes * 0.1),
      comments: Math.round(totalComments * 0.1),
    },
    {
      name: "Tue",
      likes: Math.round(totalLikes * 0.15),
      comments: Math.round(totalComments * 0.2),
    },
    {
      name: "Wed",
      likes: Math.round(totalLikes * 0.2),
      comments: Math.round(totalComments * 0.15),
    },
    {
      name: "Thu",
      likes: Math.round(totalLikes * 0.12),
      comments: Math.round(totalComments * 0.12),
    },
    {
      name: "Fri",
      likes: Math.round(totalLikes * 0.25),
      comments: Math.round(totalComments * 0.25),
    },
    {
      name: "Sat",
      likes: Math.round(totalLikes * 0.1),
      comments: Math.round(totalComments * 0.1),
    },
    {
      name: "Sun",
      likes: Math.round(totalLikes * 0.08),
      comments: Math.round(totalComments * 0.08),
    },
  ];

  res.status(200).json({
    postsCount: userPosts.length,
    followersCount: user.followers.length,
    followingCount: user.following.length,
    engagementScore: userPosts.length
      ? Math.round(
          ((totalLikes + totalComments * 2 + totalShares * 3) /
            userPosts.length) *
            10,
        ) / 10
      : 0,
    totalLikes,
    totalComments,
    totalShares,
    chartData,
  });
});

// 10. AI GENERATED POST helper
app.post("/api/gemini/generate-post-draft", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      draft: `Just thinking about ${topic} today! It's amazing how fast things are developing. What are your thoughts? #Thinking #Connectify`,
    });
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://connectify.ai",
          "X-Title": "Connectify",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: `Generate an engaging social media post about "${topic}". Include 2-3 relevant hashtags and a few emojis. Keep it under 60 words and professional yet inspiring. Do not put quotes around it.`,
            },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    res.status(200).json({ draft: content ? content.trim() : "" });
  } catch (error) {
    console.error("Error generating draft with OpenRouter:", error);
    res
      .status(500)
      .json({ error: "Failed to generate draft with OpenRouter API" });
  }
});

// ---------------- VITE MIDDLEWARE OR STATIC SERVING ----------------

function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => {
      // Port in use, try the next one
      if (startPort < 10000) {
        getAvailablePort(startPort + 1).then(resolve, reject);
      } else {
        reject(new Error("No available ports found"));
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(startPort));
    });
    server.listen(startPort, "0.0.0.0");
  });
}

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const isProduction =
    process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "src"));

  if (isProduction) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vitePort = await getAvailablePort(24678);
    const vite = await createViteServer({
      server: { middlewareMode: true, port: vitePort },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Find an available port starting from the configured PORT
  const availablePort = await getAvailablePort(Number(PORT));

  app.listen(availablePort, "0.0.0.0", () => {
    console.log(
      `[Connectify Backend Server] Running on http://localhost:${availablePort}`,
    );
  });
}

startServer();
