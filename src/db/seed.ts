/**
 * Seeds the demo members, buddy list and conversations from the Claude Design mockup.
 * Run with `npm run db:seed`. Safe to re-run: it deletes and recreates the demo members.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as schema from "./schema";

config({ path: ".env.local" });
const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
const { user, account, profiles, buddies, conversations, conversationMembers, messages } = schema;

const PASSWORD = "password123";

type Member = {
  screenName: string;
  avatarColor: string;
  realName?: string;
  location?: string;
  aboutMe?: string;
  hobbies?: string;
  gadgets?: string;
  quote?: string;
  awayMessage?: string;
};

const MEMBERS: Member[] = [
  { screenName: "SunnyD_1982", avatarColor: "#804000", realName: "Sunny", location: "Seattle, Washington", aboutMe: "Professional mixtape maker, amateur everything else.", hobbies: "Rollerblading, The X-Files, AIM away messages" },
  {
    screenName: "StarGazer99",
    avatarColor: "#000080",
    realName: "Jenny",
    location: "Portland, Oregon",
    aboutMe: "I write letters to pen pals in 6 countries and I still think dial-up sounds like music. Say hi anytime!",
    hobbies: "Mixtapes, stargazing, Tamagotchi, collecting stamps",
    gadgets: "My Discman and a beige 56k modem",
    quote: "A little message can make someone's day.",
    awayMessage: "brb, taping my song off the radio :)",
  },
  { screenName: "xoMixtapeQueen", avatarColor: "#800080", realName: "Tasha", location: "Austin, Texas", hobbies: "Mixtapes, obviously", quote: "Side B is where the good stuff is." },
  { screenName: "DialUpDave", avatarColor: "#008080", realName: "Dave", location: "Columbus, Ohio", gadgets: "A brand new 56k modem!!" },
  { screenName: "PenPal_Paris", avatarColor: "#CC0000", realName: "Amélie", location: "Paris, France", aboutMe: "I collect postcards from every country." },
  { screenName: "skater_boi77", avatarColor: "#008000", location: "San Diego, California", hobbies: "Skating, Tony Hawk, asking a/s/l" },
];

async function main() {
  const usernames = MEMBERS.map((m) => m.screenName.toLowerCase());
  const existing = await db.select({ id: user.id }).from(user).where(inArray(user.username, usernames));
  if (existing.length) {
    const dmIds = await db
      .selectDistinct({ id: conversationMembers.conversationId })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(and(eq(conversations.kind, "dm"), inArray(conversationMembers.userId, existing.map((u) => u.id))));
    if (dmIds.length) await db.delete(conversations).where(inArray(conversations.id, dmIds.map((c) => c.id)));
  }
  await db.delete(conversations).where(and(eq(conversations.kind, "room"), eq(conversations.name, "Pen Pals Lounge")));
  await db.delete(conversations).where(and(eq(conversations.kind, "group"), eq(conversations.name, "Mixtape Club")));
  await db.delete(user).where(inArray(user.username, usernames));

  const hash = await hashPassword(PASSWORD);
  const ids: Record<string, string> = {};
  const now = Date.now();

  for (const m of MEMBERS) {
    const id = crypto.randomUUID();
    ids[m.screenName] = id;
    const email = `${m.screenName.toLowerCase()}@example.com`;
    await db.insert(user).values({
      id,
      name: m.screenName,
      email,
      emailVerified: true,
      username: m.screenName.toLowerCase(),
      displayUsername: m.screenName,
      createdAt: new Date("1998-03-14T12:00:00Z"),
    });
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
    await db.insert(profiles).values({
      userId: id,
      realName: m.realName,
      location: m.location,
      aboutMe: m.aboutMe,
      hobbies: m.hobbies,
      gadgets: m.gadgets,
      quote: m.quote,
      awayMessage: m.awayMessage,
      avatarColor: m.avatarColor,
      lastSeenAt: new Date(now),
    });
  }

  const me = ids["SunnyD_1982"];
  // StarGazer99 is left off so the profile page's "Add to Buddy List" has something to do.
  await db.insert(buddies).values(
    ["xoMixtapeQueen", "DialUpDave", "PenPal_Paris", "skater_boi77"].map((n) => ({ ownerId: me, buddyId: ids[n] })),
  );
  await db.insert(buddies).values(
    ["SunnyD_1982", "xoMixtapeQueen", "PenPal_Paris"].map((n) => ({ ownerId: ids["StarGazer99"], buddyId: ids[n] })),
  );

  const minutesAgo = (m: number) => new Date(now - m * 60_000);
  type Line = [who: string, text: string, minsAgo: number];

  async function dm(other: string, lines: Line[], markRead: boolean) {
    const [c] = await db
      .insert(conversations)
      .values({ kind: "dm", dmKey: [me, ids[other]].sort().join(":") })
      .returning();
    const inserted = await db
      .insert(messages)
      .values(lines.map(([who, body, m]) => ({ conversationId: c.id, senderId: ids[who], body, createdAt: minutesAgo(m) })))
      .returning({ id: messages.id });
    const last = inserted.at(-1)!.id;
    await db.insert(conversationMembers).values([
      { conversationId: c.id, userId: me, lastReadMessageId: markRead ? last : 0 },
      { conversationId: c.id, userId: ids[other], lastReadMessageId: last },
    ]);
  }

  await dm(
    "PenPal_Paris",
    [
      ["PenPal_Paris", "I will send you a postcard of the tower", 60 * 50],
      ["SunnyD_1982", "merci!! I will send one of Mt. Hood", 60 * 50 - 5],
    ],
    true,
  );
  await dm(
    "DialUpDave",
    [
      ["SunnyD_1982", "did the new modem work?", 51],
      ["DialUpDave", "yes!! 56k baby", 39],
    ],
    true,
  );

  const [room] = await db.insert(conversations).values({ kind: "room", name: "Pen Pals Lounge" }).returning();
  await db.insert(messages).values(
    (
      [
        ["PenPal_Paris", "bonjour tout le monde", 31],
        ["skater_boi77", "a/s/l?", 30],
        ["xoMixtapeQueen", "be nice skater lol", 29],
      ] as Line[]
    ).map(([who, body, m]) => ({ conversationId: room.id, senderId: ids[who], body, createdAt: minutesAgo(m) })),
  );
  await db.insert(conversationMembers).values(MEMBERS.map((m) => ({ conversationId: room.id, userId: ids[m.screenName] })));

  // A private group chat.
  const club = ["SunnyD_1982", "StarGazer99", "xoMixtapeQueen", "DialUpDave"];
  const [group] = await db
    .insert(conversations)
    .values({ kind: "group", name: "Mixtape Club", createdBy: ids.xoMixtapeQueen })
    .returning();
  await db.insert(conversationMembers).values(club.map((n) => ({ conversationId: group.id, userId: ids[n] })));
  await db.insert(messages).values([
    { conversationId: group.id, senderId: ids.xoMixtapeQueen, kind: "system", body: "group:created", createdAt: minutesAgo(50) },
    ...(
      [
        ["xoMixtapeQueen", "ok club, theme for this month's tape?", 48],
        ["DialUpDave", "songs that sound like a modem", 46],
        ["StarGazer99", "lol. 90s slow jams pls", 44],
        ["SunnyD_1982", "video call friday? i'll bring the tracklist", 42],
      ] as Line[]
    ).map(([who, body, m]) => ({ conversationId: group.id, senderId: ids[who], body, createdAt: minutesAgo(m) })),
  ]);

  await dm(
    "xoMixtapeQueen",
    [
      ["xoMixtapeQueen", "made you a new tape!!", 19],
      ["xoMixtapeQueen", "side B is all Sixpence", 18],
    ],
    false,
  );
  await dm(
    "StarGazer99",
    [
      ["StarGazer99", "hey!! got your message this morning", 10],
      ["StarGazer99", "it seriously made my day :)", 10],
      ["SunnyD_1982", "aww yay. I almost signed it anonymous", 8],
      ["StarGazer99", 'lol I knew it was you. nobody else says "yay"', 7],
      ["SunnyD_1982", "ok fair. are you going to the Pen Pals Lounge later?", 5],
    ],
    true,
  );

  console.log(`Seeded ${MEMBERS.length} members. Sign on as SunnyD_1982 / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
