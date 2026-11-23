"use server";

import { z } from "zod";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { getViewer } from "@/lib/session";

export type NoteValues = { to: string; from: string; message: string; anonymous: boolean };
export type NoteState = { status: "idle" | "sent" | "error"; error?: string; sentAt?: number; values?: NoteValues };

const NoteSchema = z.object({
  to: z.email({ error: "Please type a real e-mail address in the To: box." }),
  from: z.string().trim().max(60).optional(),
  anonymous: z.boolean(),
  message: z
    .string()
    .trim()
    .min(1, { error: "Write a few kind words first!" })
    .max(500, { error: "Keep it under 500 characters." }),
  variant: z.enum(["portal", "geocities", "ie5"]),
});

export async function sendNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const parsed = NoteSchema.safeParse({
    to: String(formData.get("to") ?? "").trim(),
    from: String(formData.get("from") ?? "") || undefined,
    anonymous: formData.get("anonymous") === "on",
    message: String(formData.get("message") ?? ""),
    variant: formData.get("variant"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message,
      values: {
        to: String(formData.get("to") ?? ""),
        from: String(formData.get("from") ?? ""),
        message: String(formData.get("message") ?? ""),
        anonymous: formData.get("anonymous") === "on",
      },
    };
  }

  const { to, from, anonymous, message, variant } = parsed.data;
  const viewer = await getViewer();
  await db.insert(notes).values({
    toEmail: to,
    fromName: anonymous ? null : from || viewer?.screenName || null,
    anonymous,
    body: message,
    variant,
    senderUserId: viewer?.id ?? null,
  });
  return { status: "sent", sentAt: Date.now() };
}
