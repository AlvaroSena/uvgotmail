import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IncomingCallWatcher } from "@/components/call/incoming-call-watcher";
import { BuddyListPanel } from "@/components/profile/buddy-list-panel";
import { ProfileActions } from "@/components/profile/profile-actions";
import { GrooveRule, NavBar, PortalFooter, PortalFrame, PortalHeader } from "@/components/retro/retro";
import { SignOffButton } from "@/components/retro/sign-off-client";
import { getBuddyList, getMemberProfile, isBuddy } from "@/lib/profile-data";
import { requireViewer, touchPresence } from "@/lib/session";

export const metadata: Metadata = { title: "Member Profile - You've Got a Mail" };

export default function MemberPage(props: PageProps<"/members/[screenName]">) {
  return (
    <PortalFrame>
      <Suspense fallback={<ProfileLoading />}>
        <MemberProfile params={props.params} />
      </Suspense>
      <IncomingCallWatcher />
    </PortalFrame>
  );
}

function ProfileLoading() {
  return (
    <>
      <PortalHeader />
      <div className="bevel-in mt-1.5 bg-white p-6 text-center font-verdana text-xs text-win-dark">Loading profile...</div>
    </>
  );
}

async function MemberProfile({ params }: { params: PageProps<"/members/[screenName]">["params"] }) {
  const { screenName } = await params;
  const viewer = await requireViewer();
  const member = await getMemberProfile(decodeURIComponent(screenName));
  if (!member) notFound();

  const [buddyList, buddy] = await Promise.all([
    getBuddyList(viewer.id),
    isBuddy(viewer.id, member.id),
    touchPresence(viewer.id),
  ]);
  const p = member.profile;
  const facts = [
    p?.realName,
    p?.location,
    `Member since ${member.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
  ].filter(Boolean);
  const allRows: [string, React.ReactNode][] = [
    ["About me", p?.aboutMe],
    ["Hobbies", p?.hobbies],
    ["Favorite gadgets", p?.gadgets],
    ["Personal quote", p?.quote ? <span className="font-times text-[13px] italic">&quot;{p.quote}&quot;</span> : null],
    ["Birthday", p?.birthday],
  ];
  const rows = allRows.filter(([, v]) => !!v);

  return (
    <>
      <PortalHeader
        right={
          <div className="flex items-center justify-between gap-2 font-verdana text-xs text-white md:block md:text-right md:text-[11px]">
            <span className="min-w-0 truncate">
              Signed on as <b>{viewer.screenName}</b>
            </span>
            <br className="hidden md:block" />
            <SignOffButton className="tap text-sunny" />
          </div>
        }
      />
      <NavBar
        items={[
          { label: "Home", href: "/" },
          { label: "Chats", href: "/chat" },
          { label: "My Profile", href: `/members/${viewer.screenName.toLowerCase()}` },
        ]}
        right="Member Profile"
      />
      <GrooveRule />
      <div className="flex flex-col gap-1.5 md:flex-row md:items-start">
        <main className="bevel-in min-w-0 flex-1 bg-white px-3 py-3 md:px-[18px] md:py-3.5">
          <div className="flex flex-wrap items-start gap-3 md:flex-nowrap md:gap-4">
            <div
              className="bevel-in-deep flex size-16 flex-none items-center justify-center text-center font-verdana text-[22px] font-bold text-white md:size-24 md:text-[32px]"
              style={{ background: p?.avatarColor ?? "#000080" }}
              aria-hidden
            >
              {member.screenName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <h1 className="m-0 font-times text-[22px] font-bold break-all text-navy md:text-[26px]">{member.screenName}</h1>
                <span
                  className="flex items-center gap-1 font-verdana text-[10px] font-bold"
                  style={{ color: member.online ? "#008000" : "#808080" }}
                >
                  <span className="size-2 border border-black" style={{ background: member.online ? "#00CC00" : "#C0C0C0" }} />
                  {member.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="font-verdana text-xs text-win-dark">{facts.join(" · ")}</div>
              {p?.awayMessage && (
                <div className="mt-2 border border-win-shadow bg-tooltip px-2 py-[5px] font-times text-xs italic">
                  Away message: &quot;{p.awayMessage}&quot;
                </div>
              )}
              <ProfileActions
                targetId={member.id}
                targetName={member.screenName}
                profilePath={`/members/${member.username}`}
                isBuddy={buddy}
                isSelf={member.id === viewer.id}
              />
            </div>
          </div>
          <hr className="mt-3.5 mb-2.5 border-0 border-t-2 [border-style:groove] border-white" />
          {rows.length ? (
            <table cellPadding={4} className="block w-full border-collapse font-verdana text-xs md:table">
              <tbody className="block md:table-row-group">
                {rows.map(([k, v], i) => (
                  <tr key={k} className={`block md:table-row ${i % 2 === 0 ? "bg-lavender" : ""}`}>
                    <td className="block px-1 pt-1 align-top font-bold text-navy md:table-cell md:w-[130px] md:p-1">{k}</td>
                    <td className="block px-1 pb-1.5 md:table-cell md:p-1">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="font-verdana text-xs text-win-dark italic">
              {member.screenName} hasn&apos;t filled out a profile yet. Under construction!
            </p>
          )}
        </main>
        <BuddyListPanel buddies={buddyList} />
      </div>
      <GrooveRule />
      <PortalFooter />
    </>
  );
}
