import type { Metadata } from "next";
import Link from "next/link";
import { SurpriseForm } from "@/components/compose/surprise-form";
import { Envelope } from "@/components/pixel/icons";
import { SkinSwitcher, WinTitleBar } from "@/components/retro/retro";

export const metadata: Metadata = { title: "You've Got a Mail - Microsoft Internet Explorer" };

const winBtn = "h-3.5 w-4 bg-win-gray text-black border [border-color:#fff_#000_#000_#fff] font-tahoma font-bold text-[9px]/3 text-center";

export default function Ie5Home() {
  return (
    <div className="flex min-h-screen flex-col bg-teal font-tahoma text-[11px]">
      <div className="mx-auto w-full max-w-[800px] flex-1 px-1.5 pt-1.5 md:px-[18px] md:pt-[18px]">
        <div className="bevel-window bg-win-gray p-0.5">
          <div className="relative">
            <WinTitleBar title="You've Got a Mail - Microsoft Internet Explorer" />
            <span className="absolute top-[3px] right-[3px] flex gap-0.5" aria-hidden>
              <span className={winBtn}>_</span>
              <span className={winBtn}>□</span>
              <span className={`${winBtn} ml-0.5 text-[10px]`}>×</span>
            </span>
          </div>
          <div className="hidden gap-3 border-b border-win-shadow px-1.5 py-[3px] md:flex">
            <span><u>F</u>ile</span>
            <span><u>E</u>dit</span>
            <span><u>V</u>iew</span>
            <span>F<u>a</u>vorites</span>
            <span><u>T</u>ools</span>
            <span><u>H</u>elp</span>
          </div>
          <div className="flex items-center gap-1.5 border-t border-white px-1.5 py-[3px]">
            <span className="hidden text-win-shadow sm:inline">Address</span>
            <div className="bevel-in min-w-0 flex-1 truncate bg-white px-1 py-px font-tahoma text-[11px]">http://www.youvegotamail.com/index.html</div>
            <Link href="/" className="bevel-thin-out px-2 py-px text-black! no-underline">
              Go
            </Link>
          </div>
          <div className="bevel-in relative overflow-hidden bg-white md:min-h-[600px]">
            <div className="mx-auto w-full px-2.5 pt-3 pb-3 md:w-[700px] md:px-0 md:pt-3.5 md:pb-0 font-arial text-xs/[1.45] text-black">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1 border-b-[3px] border-double border-navy pb-2 md:flex-nowrap">
                <Envelope bob />
                <div className="min-w-0 flex-1">
                  <h1 className="m-0 font-georgia text-[24px]/none md:text-[30px]/none font-bold text-navy">
                    You&apos;ve Got a Mail<span className="align-super text-[13px] text-alert">.com</span>
                  </h1>
                  <div className="mt-[3px] font-times text-[13px] text-[#333] italic">A little message can make someone&apos;s day.</div>
                </div>
                <nav className="flex w-full gap-3 font-verdana text-xs font-bold md:w-auto md:gap-2.5">
                  <Link href="/home/ie5" className="tap inline-flex items-center">Home</Link>
                  <Link href="/signon" className="tap inline-flex items-center">Sign On</Link>
                  <Link href="/chat" className="tap inline-flex items-center">Chat</Link>
                </nav>
              </div>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="font-verdana text-[17px] font-bold text-black md:text-[19px]">Send someone a little surprise!</div>
                  <div className="mt-[3px] mb-2.5 text-[#333]">It&apos;s free, it&apos;s fast, and it might be the best thing in their inbox today.</div>
                  <SurpriseForm variant="ie5" />
                </div>
                <div className="grid w-full grid-cols-2 gap-2.5 md:flex md:w-[190px] md:flex-col">
                  <div className="border border-navy bg-tooltip px-2 py-3 text-center">
                    <div className="flex justify-center">
                      <Envelope size="big" />
                    </div>
                    <div className="mt-2 font-arial text-base font-bold text-navy">You&apos;ve Got Mail!</div>
                  </div>
                  <div className="font-verdana text-[11px]/[1.6] text-[#333]">
                    <b className="text-navy">How it works</b>
                    <br />
                    Type an address, write a note, press Send. That&apos;s it. No sign-up needed.
                  </div>
                  <div className="col-span-2 text-center font-verdana text-[10px] md:col-span-1">
                    Visitors:{" "}
                    <span className="bg-black px-1 py-px font-courier text-[13px] font-bold tracking-[2px] text-lcd">001337</span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 border-t border-[#999] pt-1.5 text-center font-verdana text-[10px]/[1.6] text-[#555]">
                &copy; 1999 You&apos;ve Got a Mail · Best viewed at 800x600 · Made with love and HTML
                <br />
                <SkinSwitcher current="ie5" />
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 pt-0.5">
            <span className="bevel-thin-in flex-1 px-1 py-px">Done</span>
            <span className="bevel-thin-in w-[110px] px-1 py-px md:w-[140px]">Internet zone</span>
          </div>
        </div>
        <div className="h-2 md:h-[18px]" />
      </div>
      <div className="flex items-center gap-1 border-t-2 border-win-light bg-win-gray px-1 py-[3px]">
        <span className="bevel-out px-2 py-0.5 font-tahoma text-[11px] font-bold">Start</span>
        <span className="flex w-[200px] min-w-0 shrink items-center gap-1 truncate border-2 [border-color:#404040_#fff_#fff_#404040] bg-win-light px-1.5 py-0.5">
          <Envelope size="xs" />
          You&apos;ve Got a Mail - Micr...
        </span>
        <span className="bevel-thin-in ml-auto px-2.5 py-0.5">9:41 PM</span>
      </div>
    </div>
  );
}
