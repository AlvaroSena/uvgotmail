import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ---------- Better Auth core tables ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ---------- App tables ---------- */

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  realName: text("real_name"),
  location: text("location"),
  birthday: text("birthday"),
  aboutMe: text("about_me"),
  hobbies: text("hobbies"),
  gadgets: text("gadgets"),
  quote: text("quote"),
  awayMessage: text("away_message"),
  avatarColor: text("avatar_color").notNull().default("#000080"),
  listedInDirectory: boolean("listed_in_directory").notNull().default(true),
  invisible: boolean("invisible").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at"),
});

export const buddies = pgTable(
  "buddies",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    buddyId: text("buddy_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.buddyId] })],
);

export const conversationKind = pgEnum("conversation_kind", ["dm", "room", "group"]);
export const messageKind = pgEnum("message_kind", ["text", "system"]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  kind: conversationKind("kind").notNull().default("dm"),
  name: text("name"),
  /** For DMs: "<smallerUserId>:<largerUserId>" so a pair only ever has one DM. */
  dmKey: text("dm_key").unique(),
  /** Who created a group (null for DMs and rooms). */
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastReadMessageId: integer("last_read_message_id").notNull().default(0),
    typingUntil: timestamp("typing_until"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_members_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => user.id, {
      onDelete: "set null",
    }),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.id)],
);

export const messageHearts = pgTable(
  "message_hearts",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export const notes = pgTable("notes", {
    id: serial("id").primaryKey(),
    toEmail: text("to_email").notNull(),
    fromName: text("from_name"),
    anonymous: boolean("anonymous").notNull().default(false),
    body: text("body").notNull(),
    variant: text("variant").notNull(),
    senderUserId: text("sender_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ---------- Relations ---------- */

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profiles, { fields: [user.id], references: [profiles.userId] }),
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

/* ---------- Video / voice calls (peer-to-peer WebRTC mesh, up to 4 people) ---------- */

export const callStatus = pgEnum("call_status", ["ringing", "active", "ended", "declined", "missed", "cancelled"]);
export const signalKind = pgEnum("signal_kind", ["offer", "answer", "ice"]);

export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** Who started the call. */
    startedBy: text("started_by").references(() => user.id, { onDelete: "cascade" }),
    /** Legacy 1:1 columns (kept nullable so older deployments keep working). */
    callerId: text("caller_id").references(() => user.id, { onDelete: "cascade" }),
    calleeId: text("callee_id").references(() => user.id, { onDelete: "cascade" }),
    status: callStatus("status").notNull().default("ringing"),
    /** "video" or "voice" as requested by the caller. */
    withVideo: boolean("with_video").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    answeredAt: timestamp("answered_at"),
    endedAt: timestamp("ended_at"),
    endedBy: text("ended_by"),
    /** Heartbeats from each side's call window; a quiet side ends the call. */
    callerSeenAt: timestamp("caller_seen_at"),
    calleeSeenAt: timestamp("callee_seen_at"),
    /** Most people in the call at once (for the history line). */
    peakParticipants: integer("peak_participants").notNull().default(0),
  },
  (t) => [index("calls_callee_status_idx").on(t.calleeId, t.status), index("calls_caller_status_idx").on(t.callerId, t.status)],
);

export const callSignals = pgTable(
  "call_signals",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Mesh routing: which participant session sent it and which one it's for. */
    fromParticipantId: integer("from_participant_id"),
    toParticipantId: integer("to_participant_id"),
    kind: signalKind("kind").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("call_signals_call_idx").on(t.callId, t.id)],
);

export const ringStatus = pgEnum("ring_status", ["ringing", "joined", "declined", "missed"]);

/** One row per time someone is in a call. The id is that person's peer identity in the mesh. */
export const callParticipants = pgTable(
  "call_participants",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    withVideo: boolean("with_video").notNull().default(true),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    leftAt: timestamp("left_at"),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (t) => [index("call_participants_call_idx").on(t.callId), index("call_participants_user_idx").on(t.userId)],
);

/** Who was rung when the call started. */
export const callRings = pgTable(
  "call_rings",
  {
    callId: integer("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: ringStatus("status").notNull().default("ringing"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.callId, t.userId] }), index("call_rings_user_idx").on(t.userId, t.status)],
);
