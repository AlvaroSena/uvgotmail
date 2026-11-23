# You've Got a Mail

Live: https://uvgotmail.vercel.app · Works on phones (360px+) and desktop. See `DESIGN.md` for the design brief.

A 1999-style messaging site, built from the Claude Design project "Homepage mockups, 1999 style".

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon Postgres · Better Auth.

## Screens

| Route | Design | What it does |
| --- | --- | --- |
| `/` | 1a Portal | "Send someone a little surprise!" form (notes are stored in `notes`, no e-mail is sent) |
| `/home/geocities` | 1b Personal homepage | Same form, GeoCities skin |
| `/home/ie5` | 1c IE5 on Win98 | Same form inside a fake browser window |
| `/signon` | 2a | Sign on with a screen name, or sign up |
| `/members/[screenName]` | 2b | Profile, Add to Buddy List, Buddy List panel, Instant Message window |
| `/chat/[id]` | 3a | Conversations, thread, hearts (double-click), Buzz!, typing indicator, read receipts |
| `/call/[id]` | — | Video/voice call for up to 4 people (peer-to-peer WebRTC mesh) in DMs, groups and rooms. CU-SeeMe retro filter with Hi-Fi toggle, mute, camera, Buzz!, People list |

Chat updates by polling `POST /api/chat/[id]` every 2 seconds. A member counts as online if they were active in the last 2 minutes (and didn't sign on invisible).

Group chats: private groups of 3–12 people, created from "+ New › New Group" (`src/actions/groups.ts`).

Calls: each person in a call is a participant session; every pair of sessions has its own peer connection, and the newer one sends the offer. Offers, answers and ICE candidates go through `POST /api/calls/[id]/signal` and are picked up by polling `POST /api/calls/[id]?pid=` (every 1–2.5s, which also acts as a heartbeat; a window that goes quiet for 30s leaves the call). These are route handlers, not server actions, because a page's server actions run one at a time. Incoming calls are picked up by `POST /api/calls/incoming` every 3s on chat, profile and ended-call pages. Media flows directly between browsers via Google's public STUN server; there's no TURN relay, so some strict networks can't connect.

## Setup

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run db:migrate           # apply migrations in ./drizzle
npm run db:seed              # demo members + conversations from the mockup
npm run dev
```

Sign on as **SunnyD_1982** / **password123** (every seeded member uses the same password, e.g. StarGazer99).
Re-running `db:seed` recreates the demo members and their conversations.

## Scripts

- `npm run db:generate`: create a migration after editing `src/db/schema.ts`
- `npm run db:migrate` / `db:push` / `db:studio`
- `npm run lint`, `npm run typecheck`, `npm run build`

## Layout

```
src/
  app/          routes (+ api/auth, api/chat, api/calls)
  actions/      server actions (notes, auth, chat, buddies)
  components/   retro/ (bevels, headers), pixel/ (SVG pixel art), compose/, auth/, chat/, profile/
  db/           Drizzle schema, client, seed
  lib/          auth, session, chat/profile data access, formatting
  proxy.ts      redirects signed-out visitors away from /chat, /members and /call
```
