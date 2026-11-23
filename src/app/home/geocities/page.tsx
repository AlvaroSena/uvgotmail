import type { Metadata } from "next";
import Link from "next/link";
import { SurpriseForm } from "@/components/compose/surprise-form";
import { Envelope, Star } from "@/components/pixel/icons";
import { SkinSwitcher } from "@/components/retro/retro";

export const metadata: Metadata = { title: "~*~ You've Got a Mail ~*~" };

export default function GeoCitiesHome() {
  return (
    <div className="min-h-screen bg-[#000033] bg-[radial-gradient(#fff_1px,transparent_1.4px),radial-gradient(#9999ff_1px,transparent_1.4px)] bg-size-[53px_53px,37px_37px] bg-position-[0_0,18px_24px] px-2 py-2 md:px-0 md:py-5">
      <div className="mx-auto w-full border-[3px] [border-style:ridge] border-[#9999CC] bg-[#FFFFF0] px-3 py-4 md:w-[720px] md:px-[26px] font-times text-[15px]/[1.4] text-black">
        <div className="flex items-center justify-center gap-2 md:gap-3.5">
          <Star />
          <div className="hidden sm:block">
            <Envelope bob />
          </div>
          <h1 className="m-0 text-center font-times text-[30px]/none font-bold text-navy md:text-[40px]/none">You&apos;ve Got a Mail</h1>
          <div className="hidden sm:block">
            <Envelope bob />
          </div>
          <Star delayed />
        </div>
        <div className="mt-1.5 text-center text-[#800000] italic">~ A little message can make someone&apos;s day. ~</div>
        <nav className="mt-2.5 flex flex-wrap justify-center gap-x-2.5 text-center font-arial text-[13px] font-bold">
          <span className="tap inline-flex items-center whitespace-nowrap">
            [ <Link href="/home/geocities">Home</Link> ]
          </span>
          <span className="tap inline-flex items-center whitespace-nowrap">
            [ <Link href="/">The Portal</Link> ]
          </span>
          <span className="tap inline-flex items-center whitespace-nowrap">
            [ <Link href="/signon">Sign On</Link> ]
          </span>
          <span className="tap inline-flex items-center whitespace-nowrap">
            [ <Link href="/chat">Chat with Buddies</Link> ]
          </span>
        </nav>
        <hr className="mt-3 mb-2 border-0 border-t-2 [border-style:groove] border-[#ccc]" />
        <div className="overflow-hidden border border-black bg-navy py-[3px] font-courier text-xs font-bold whitespace-nowrap text-[#FFFF00]">
          <div className="inline-block animate-marquee">
            *** NEW! Send anonymous messages *** Over 1,000 smiles delivered this week *** Tell a friend about
            You&apos;ve Got a Mail! ***
          </div>
        </div>
        <div className="mt-4 mb-1 text-center">
          <div className="font-times text-[22px] font-bold text-alert md:text-[26px]">Send someone a little surprise!</div>
          <div className="mt-1">Fill out the form below and your words will land in their inbox, just like that.</div>
        </div>
        <SurpriseForm variant="geocities" />
        <hr className="mt-[18px] mb-2.5 border-0 border-t-2 [border-style:groove] border-[#ccc]" />
        <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
          You are visitor number{" "}
          <span className="bg-black px-[5px] py-px font-courier text-[15px] font-bold tracking-[3px] text-[#FF3333]">001337</span>
        </div>
        <div className="mt-2 text-center font-arial text-[11px]/[1.6] text-[#555]">
          Best viewed at 800x600 · Copyright &copy; 1999 You&apos;ve Got a Mail
          <br />
          Made with love and HTML · <SkinSwitcher current="geocities" />
        </div>
      </div>
    </div>
  );
}
