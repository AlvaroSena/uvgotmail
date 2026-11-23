# DESIGN.md · You've Got a Mail

> If this file and the code disagree, the code wins until the person decides. Note the conflict under Open questions.

## Product
A 1999-styled web app for sending small kind messages. Anyone can send an anonymous or signed note to an e-mail address from the homepage. Members sign on with a screen name to keep a buddy list and chat in real time (DMs and chat rooms). It's used on desktop and, from now on, on phones.
The most-used screen is the chat (`/chat/[id]`). Its job is to read and reply to a buddy in seconds.

## Audience and voice
People who like 90s internet nostalgia. The voice is playful, warm and short, using period slang ("brb", "a/s/l", ":-)"). English, 12-hour times ("9:31 PM").

## Mood
Words: nostalgic, friendly, chunky (Win98 / AOL / GeoCities).
Never like: modern app chrome (rounded cards, blur, gradients outside Win98 title bars, Material or iOS controls). Never a pinch-and-zoom desktop page on phones. No hamburger menus, so links stay visible like the original nav bars. Never a phone version that loses a desktop feature (Buzz, hearts, IM window, the three homepage skins, sounds).

## Brand
Design system source: `src/app/globals.css` (`@theme` tokens and `@utility` bevels) plus `src/components/retro/retro.tsx` and `src/components/pixel/icons.tsx`.
- **Colours:** win-gray `#C0C0C0`, navy `#000080`, butter `#FFFFCC`, tooltip `#FFFFE1`, lilac `#CCCCFF`, alert `#CC0000`, LCD green `#00FF00`.
- **Fonts:** Verdana (UI), Times New Roman (headlines), Courier New (inputs, counters), Tahoma (window chrome).
- **Logo:** pixel-art envelope SVG.
- **Bevels:** `bevel-out`, `bevel-in`, `bevel-in-deep`, `bevel-btn`, `bevel-window`.
- **Origin:** the Claude Design project "Homepage mockups, 1999 style", file `Youve Got a Mail.dc.html`.

## References
- **AOL 4/5 portal (design 1a):** take the gray chrome, navy banner and sidebar boxes. Avoid nothing; it's the base.
- **GeoCities personal homepage (1b):** take the starfield, centred Times type and marquee. Avoid unreadable colour-on-colour text.
- **IE5 on Win98 (1c):** take the window frame, menu bar and taskbar. On phones, avoid frames that eat the screen.
- **AIM buddy list and IM window (2b/3a):** take the presence dots, unread badges and Buzz.

## Constraints
- **Widths:** phone first at 360–430px. The current desktop layout stays as it is (800px window) from the `md` breakpoint (768px) up.
- **Phones:**
  - **Layout:** one column. Panels stack; sidebars move below the main content. Chat becomes two screens, list and then thread, with a Back button.
  - **Sizing:** tap targets at least 44px, body text at least 12px, inputs at 16px so iOS doesn't zoom in.
  - **Scrolling:** no horizontal page scroll.
- **Theme:** light only. That's period accurate.
- **Skins on phones:** IE5 (1c) keeps a slimmed browser frame: title bar, address bar, status bar and taskbar, with the menu bar hidden. GeoCities (1b) keeps its ridge border, with an 8px starfield margin.
- **Motion:** the existing bob, blink and marquee animations. Sounds: synthesized dial-up on sign on, plus call ring-back and an incoming ring, all following the same mute switch.

## Decisions log
- 2026-11-22 — **Mobile keeps the same 1999 look, restacked:** single column, same tokens, bigger taps. The user chose this over a Palm-style or WAP-style version.
- 2026-11-22 — **Desktop (≥768px) stays pixel-identical to the Claude Design mockup:** the mockup is the approved source.

- 2026-11-22 — Brief approved. Importing the design system into a design tool was declined — the mobile layouts are built straight in code and reviewed in Chrome.
- 2026-11-22 — **On phones, `/chat` opens the Conversations list.** Desktop still forwards to the latest conversation. Why: it's AIM-like, and a phone has room for only one panel at a time.
- 2026-11-22 — **Phone thread header:** a ◄ Back button showing the unread count of the other chats; the buddy's name links to their profile ("View Profile" text is desktop-only); B/I/U are desktop-only. Why: fit 360px without dropping any feature.
- 2026-11-22 — **System: `tap` utility (44px minimum on phones) and a global 16px phone input size** in `globals.css`. Why: tap-size and no-zoom constraints. Affects every screen's buttons, links and inputs below 768px.
- 2026-11-22 — **IM window on phones docks to the bottom at full width**, with a 45dvh message area. Why: a floating 340px window doesn't fit.
- 2026-11-22 — **A 404 Win98 error dialog replaces Next's default 404.** Why: the black default page broke the mood, and authorization failures land on it.
- 2026-11-22 — **Deployed to Vercel production** at https://uvgotmail.vercel.app (team totems).
- 2026-11-22 — **Video calls deployed to production** and checked there with a two-person call test.
- 2026-11-23 — **Private group chats** (3–12 people). Anyone creates one from "+ New › New Group"; every member can add people, rename it and leave; the last one out deletes it. Why: the user chose invite-only groups over public rooms.
- 2026-11-23 — **Group avatar is the group's initials on a colour square with a stacked shadow**, and the header says "5 members · 3 online". Members, Add, Rename and Leave live in a Win98 "Members" dialog that docks to the bottom on phones (Leave asks to confirm).
- 2026-11-23 — **Calls work in DMs, groups and rooms, up to 4 people** (peer-to-peer mesh, no new service). Why: the user picked a 4-person mesh over a managed video service.
- 2026-11-23 — **Ring once, then drop in:** starting a call rings every other member (not in public rooms), and a butter-yellow "📹 Video call in progress · 2/4 · Join" bar sits under the thread header until the last person leaves. The list shows a 📹 badge. A 5th person sees "This call is full (4/4)".
- 2026-11-23 — **Call layout:** you alone fill the stage under a "Ringing…" panel; 2 people keep the big video and "You" picture-in-picture; 3–4 people get a 2×2 grid of sunken tiles with a navy name strip (an "Empty seat" tile when there are 3). Join/leave toasts are butter yellow.
- 2026-11-23 — **1:1 calls run on the same engine and still end for both people when either hangs up** (like a phone); group calls stay open until the last person leaves.
- 2026-11-23 — **Groups and group calls deployed to production**, checked there with the 4-person and 1:1 call tests.
- 2026-11-23 — **Phone call button is icon-only (📹)** in thread headers, with "Call" as its accessible name. Why: group headers need the room for the name and the Members button.
- 2026-11-22 — **1:1 video and voice calls at `/call/[id]`**, styled as a NetMeeting-like Win98 window. Started from "📹 Call" in DM headers or "📹 Video Call" on profiles; rooms stay text-only. Why: the user picked 1:1 from DMs over group calls.
- 2026-11-22 — **Peer-to-peer WebRTC, with setup messages over the existing DB polling and Google's public STUN, no TURN relay.** Why: free, no new service. Trade-off: some strict networks can't connect, which shows a designed "Couldn't Connect" dialog.
- 2026-11-22 — **The video uses a CU-SeeMe look by default** (160×120 pixels, scanlines, 12fps), with a Hi-Fi toggle. Why: the user chose a toggleable retro filter.
- 2026-11-22 — **Phone call layout:** the video fills the window, the self-view sits in the top right, and the toolbar is a bottom bar of 44px buttons that show only icons (with accessible labels).
- 2026-11-22 — **Calls end on their own when a window goes quiet for 30s** (heartbeats). Why: a crashed tab left a call "active" forever, and both people showed as busy.
- 2026-11-22 — **System: `animate-static` token** (TV-static noise for the "Connecting" state) in `globals.css`. Affects only the call screen.

## Open questions
- None right now.
