import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16).default("development-session-secret-change-me"),
  PROPERTY_TIMEZONE: z.string().default("Asia/Colombo"),
  DEFAULT_CURRENCY: z.string().default("LKR"),
  PAYHERE_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYHERE_MERCHANT_ID: z.string().default(""),
  PAYHERE_MERCHANT_SECRET: z.string().default(""),
  PAYHERE_NOTIFY_URL: z.string().url().optional(),
  PAYHERE_RETURN_URL: z.string().url().optional(),
  PAYHERE_CANCEL_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().min(16).default("development-cron-secret"),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  MANAGE_BOOKING_TOKEN_SECRET: z.string().min(16).default("development-manage-token-secret"),
  ICAL_FEED_SECRET: z.string().min(16).default("development-ical-feed-secret"),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
