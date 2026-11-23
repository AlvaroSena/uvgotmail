import type { Metadata } from "next";
import { SignOnForm, SignUpForm } from "@/components/auth/auth-forms";
import { GrooveRule, NavBar, PortalFooter, PortalFrame, PortalHeader, VisitorCounter } from "@/components/retro/retro";

export const metadata: Metadata = { title: "Sign On - You've Got a Mail" };

export default function SignOnPage() {
  return (
    <PortalFrame>
      <PortalHeader />
      <NavBar
        items={[{ label: "Home", href: "/" }, { label: "How It Works", href: "/#how-it-works" }, { label: "Sign On" }]}
        right="1,204 members chatting right now"
      />
      <GrooveRule />
      <main className="bevel-in bg-white px-3 py-3 md:px-[18px] md:py-3.5">
        <h1 className="m-0 font-times text-[22px] font-bold text-navy">Welcome! Come on in and say hello.</h1>
        <p className="mt-1 mb-3 font-verdana text-xs">
          Sign on with your screen name to see who&apos;s online, or make a free account in under a minute.
        </p>
        <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2">
          <SignOnForm />
          <SignUpForm />
        </div>
        <div id="rules" className="mt-3.5 border border-win-shadow bg-tooltip px-2 py-1.5 font-verdana text-[10px]">
          <b>Rules of the Road:</b> be kind, no flaming, no chain letters, and never give out your password. Not even to
          someone who says they work here.
        </div>
      </main>
      <GrooveRule />
      <PortalFooter>
        <VisitorCounter /> visitors
        <br />
        Copyright &copy; 1999 You&apos;ve Got a Mail. All rights reserved.
        <br />
        <span className="text-win-dark">Best viewed at 800x600 · Made with love and HTML</span>
      </PortalFooter>
    </PortalFrame>
  );
}
