import Link from "next/link";
import { Envelope } from "@/components/pixel/icons";
import { PortalFrame, WinTitleBar } from "@/components/retro/retro";

export default function NotFound() {
  return (
    <PortalFrame className="!p-0 md:!p-1.5">
      <div className="flex min-h-dvh items-center justify-center bg-teal p-4 md:min-h-[420px]">
        <div role="alert" className="bevel-window w-full max-w-[340px] bg-win-gray p-0.5 font-tahoma text-[11px]">
          <WinTitleBar title="Error" icon={false} />
          <div className="flex items-start gap-3 px-3 py-4">
            <Envelope size="md" />
            <div>
              <b className="text-xs">404 - Page Not Found</b>
              <p className="mt-1 mb-0">
                That page has left the building, or it isn&apos;t yours to see. Check the address and try again.
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-2 pb-3">
            <Link href="/" className="bevel-btn tap inline-flex items-center px-5 py-[3px] text-black! no-underline">
              Home
            </Link>
            <Link href="/chat" className="bevel-btn tap inline-flex items-center px-5 py-[3px] text-black! no-underline">
              My Chats
            </Link>
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}
