import Link from "next/link";
import { SurpriseForm } from "@/components/compose/surprise-form";
import { Envelope } from "@/components/pixel/icons";
import { GrooveRule, NavBar, PortalFooter, PortalFrame, PortalHeader, SkinSwitcher, VisitorCounter } from "@/components/retro/retro";

export default function PortalHome() {
  return (
    <PortalFrame>
      <PortalHeader />
      <NavBar
        items={[
          { label: "Home", href: "/" },
          { label: "How It Works", href: "#how-it-works" },
          { label: "Sign On", href: "/signon" },
          { label: "Chats", href: "/chat" },
        ]}
        right="Monday, November 22, 1999"
      />
      <GrooveRule />
      <div className="flex flex-col-reverse gap-1.5 md:flex-row md:items-start">
        <aside className="grid w-full grid-cols-2 gap-1.5 md:flex md:w-[176px] md:flex-col">
          <div className="bevel-in bg-white p-2.5 text-center">
            <div className="flex justify-center">
              <Envelope size="big" />
            </div>
            <div className="mt-2 font-arial text-[15px] font-bold text-navy">You&apos;ve Got Mail!</div>
            <div className="mt-[3px] font-verdana text-[10px] text-win-dark">Someone is thinking of you.</div>
          </div>
          <div id="how-it-works" className="border border-win-shadow bg-win-light p-2">
            <div className="mb-1 font-verdana text-[11px] font-bold text-navy">How it works</div>
            <div className="font-verdana text-[10px]/[1.5]">
              1. Type an e-mail address
              <br />
              2. Write a few kind words
              <br />
              3. Press Send!
            </div>
          </div>
          <div className="border border-win-shadow bg-win-light p-2 font-verdana text-[10px]/[1.5]">
            <div className="mb-1 text-[11px] font-bold text-navy">Members</div>
            <Link href="/signon">Sign on</Link> to chat with your buddies, or get a free screen name!
          </div>
          <div className="py-1.5 text-center font-verdana text-[10px]">
            Visitors:
            <br />
            <VisitorCounter size="lg" />
          </div>
        </aside>
        <main className="bevel-in min-w-0 flex-1 bg-white px-3 py-3 md:px-[18px] md:py-3.5">
          <h1 className="m-0 font-times text-[22px] font-bold text-navy">Send someone a little surprise!</h1>
          <p className="mt-1 mb-2.5 font-verdana text-xs">
            Write a short note to a friend, a relative or an old pen pal. We&apos;ll deliver it straight to their inbox.
          </p>
          <SurpriseForm variant="portal" />
        </main>
      </div>
      <GrooveRule />
      <PortalFooter>
        <Link href="/">Home</Link> | <Link href="#how-it-works">How It Works</Link> | <Link href="/signon">Sign On</Link>
        <br />
        Copyright &copy; 1999 You&apos;ve Got a Mail. All rights reserved.
        <br />
        <span className="text-win-dark">
          Best viewed at 800x600 in Netscape Navigator 4 or Internet Explorer 5 · Made with love and HTML
        </span>
        <br />
        <SkinSwitcher current="portal" />
      </PortalFooter>
    </PortalFrame>
  );
}
