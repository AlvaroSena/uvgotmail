"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversationMembers, conversations, profiles } from "@/db/schema";
import { auth } from "@/lib/auth";

export type SignOnState = { error?: string; screenName?: string };
export type SignUpValues = { screenName?: string; email?: string; month?: string; day?: string; year?: string };
export type SignUpState = { error?: string; done?: boolean; values?: SignUpValues };

const AVATAR_COLORS = ["#000080", "#800080", "#008080", "#806000", "#CC0000", "#008000", "#804000"];

export async function signOn(_prev: SignOnState, formData: FormData): Promise<SignOnState> {
  const username = String(formData.get("screenName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fail = (error: string): SignOnState => ({ error, screenName: username });
  if (!username || !password) return fail("Type your screen name and password.");

  try {
    const res = await auth.api.signInUsername({
      body: { username, password, rememberMe: formData.get("remember") === "on" },
      headers: await headers(),
    });
    if (!res) return fail("Wrong screen name or password.");
    await db
      .insert(profiles)
      .values({ userId: res.user.id, invisible: formData.get("invisible") === "on", lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { invisible: formData.get("invisible") === "on", lastSeenAt: new Date() },
      });
  } catch (e) {
    if (e instanceof APIError) return fail("Wrong screen name or password.");
    throw e;
  }
  redirect("/chat");
}

const SignUpSchema = z.object({
  screenName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,16}$/, { error: "Screen names are 3-16 letters, numbers or _." }),
  email: z.email({ error: "That e-mail address doesn't look right." }),
  password: z.string().min(6, { error: "Passwords need at least 6 characters." }),
});

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const password = String(formData.get("password") ?? "");
  const values: SignUpValues = {
    screenName: String(formData.get("screenName") ?? ""),
    email: String(formData.get("email") ?? ""),
    month: String(formData.get("month") ?? ""),
    day: String(formData.get("day") ?? ""),
    year: String(formData.get("year") ?? ""),
  };
  const fail = (error: string): SignUpState => ({ error, values });
  if (password !== String(formData.get("password2") ?? "")) return fail("Oops! Your passwords don't match.");
  if (formData.get("rules") !== "on") return fail("Please agree to the Rules of the Road.");

  const parsed = SignUpSchema.safeParse({
    screenName: formData.get("screenName"),
    email: String(formData.get("email") ?? "").trim(),
    password,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Something's not right.");
  const { screenName, email } = parsed.data;

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({
      body: { name: screenName, email, password, username: screenName, displayUsername: screenName },
      headers: await headers(),
    });
    userId = res.user.id;
  } catch (e) {
    if (e instanceof APIError) {
      const msg = String(e.body?.message ?? e.message);
      if (/username/i.test(msg)) return fail("That screen name is taken. Try adding some numbers!");
      if (/email|exist/i.test(msg)) return fail("There's already a member with that e-mail.");
      return fail(msg);
    }
    throw e;
  }

  const month = values.month ?? "";
  const day = (values.day ?? "").trim();
  const year = (values.year ?? "").trim();
  const birthday = month && month !== "Month" && day && year ? `${month} ${day}, ${year}` : null;

  await db
    .insert(profiles)
    .values({
      userId,
      birthday,
      listedInDirectory: formData.get("directory") === "on",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      lastSeenAt: new Date(),
    })
    .onConflictDoNothing();

  // Drop new members into every chat room so the Conversations list isn't empty.
  const rooms = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.kind, "room"));
  if (rooms.length) {
    await db
      .insert(conversationMembers)
      .values(rooms.map((r) => ({ conversationId: r.id, userId })))
      .onConflictDoNothing();
  }

  return { done: true };
}

export async function signOff() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/signon");
}

