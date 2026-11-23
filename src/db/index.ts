import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set; database calls will fail. See .env.example.");
}

export const db = drizzle(neon(process.env.DATABASE_URL ?? "postgresql://missing:missing@localhost/missing"), { schema });
