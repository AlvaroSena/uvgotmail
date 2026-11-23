import Link from "next/link";
import { Envelope, Star } from "@/components/pixel/icons";

/** The gray "portal" window every 1a-style screen lives in: 800px on desktop, full width on phones. */
export function PortalFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-[#a8a8a8] md:py-6">
      <div
        className={`relative mx-auto w-full min-w-0 bg-win-gray md:w-[800px] p-1.5 font-verdana text-xs/[1.4] text-black shadow-[0_1px_3px_rgba(0,0,0,.3)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function PortalHeader({ right }: { right?: React.ReactNode }) {
  return (
    <div className="bevel-out flex flex-wrap items-center gap-x-3 gap-y-2 bg-navy px-2.5 py-2 md:flex-nowrap md:gap-3.5 md:px-3.5 md:py-2.5">
      <Envelope bob />
      <div className="min-w-0 flex-1">
        <Link href="/" className="font-times text-[26px]/none font-bold italic tracking-[-0.5px] text-white! no-underline md:text-[34px]/none">
          You&apos;ve Got a Mail
        </Link>
        <div className="mt-[5px] font-verdana text-[11px] text-sunny">A little message can make someone&apos;s day.</div>
      </div>
      {right ? (
        <div className="w-full border-t border-[#3030a0] pt-1.5 md:w-auto md:border-0 md:pt-0">{right}</div>
      ) : (
        <div className="hidden gap-1 sm:flex">
          <Star />
          <Star delayed />
          <Star />
        </div>
      )}
    </div>
  );
}

export type NavItem = { label: string; href?: string };

export function NavBar({ items, right }: { items: NavItem[]; right?: React.ReactNode }) {
  return (
    <nav className="mt-1 flex flex-wrap items-center gap-x-1.5 border border-win-shadow bg-white px-2.5 py-0.5 font-verdana text-xs font-bold md:flex-nowrap md:py-1 md:text-[11px]">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5">
          {i > 0 && <span>|</span>}
          {it.href ? (
            <Link href={it.href} className="tap inline-flex items-center">
              {it.label}
            </Link>
          ) : (
            <span className="tap inline-flex items-center text-black">{it.label}</span>
          )}
        </span>
      ))}
      {right && (
        <span className="w-full border-t border-dotted border-win-gray py-1 font-normal text-win-dark md:ml-auto md:w-auto md:border-0 md:py-0">
          {right}
        </span>
      )}
    </nav>
  );
}

export function GrooveRule() {
  return <hr className="groove-rule my-1.5" />;
}

export function VisitorCounter({ size = "sm" }: { size?: "sm" | "lg" }) {
  return size === "lg" ? (
    <span className="bevel-in mt-[3px] inline-block bg-black px-[5px] py-0.5 font-courier text-sm font-bold tracking-[3px] text-lcd">
      001337
    </span>
  ) : (
    <span className="bg-black px-1 py-px font-courier text-xs font-bold tracking-[2px] text-lcd">001337</span>
  );
}

/** Small navy title strip used on panels ("Conversations", "Buddy List", "Sign On"). */
export function PanelTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 bg-navy px-1.5 py-[3px] font-tahoma text-[11px] font-bold text-white ${className}`}>
      {children}
    </div>
  );
}

/** Win98 window title bar with the blue gradient. */
export function WinTitleBar({ title, onClose, icon = true }: { title: string; onClose?: () => void; icon?: boolean }) {
  return (
    <div className="flex items-center gap-[5px] bg-[linear-gradient(90deg,#000080,#1084D0)] py-[3px] pr-[3px] pl-[5px] font-tahoma text-[11px] font-bold text-white">
      {icon && <Envelope size="xs" />}
      <span className="flex-1">{title}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-7 w-8 cursor-pointer border [border-color:#fff_#000_#000_#fff] bg-win-gray p-0 text-center font-tahoma text-sm/6 font-bold text-black md:h-3.5 md:w-4 md:text-[10px]/3"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function PortalFooter({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="pb-1 text-center font-verdana text-[10px]/[1.6] text-black">
      {children ?? (
        <>Copyright &copy; 1999 You&apos;ve Got a Mail · Best viewed at 800x600 · Made with love and HTML</>
      )}
    </footer>
  );
}

/** "Also available in" links between the three homepage skins. */
export function SkinSwitcher({ current }: { current: "portal" | "geocities" | "ie5" }) {
  const skins = [
    { id: "portal", label: "Portal", href: "/" },
    { id: "geocities", label: "Personal Homepage", href: "/home/geocities" },
    { id: "ie5", label: "Internet Explorer 5", href: "/home/ie5" },
  ] as const;
  return (
    <span>
      View this site as:{" "}
      {skins.map((s, i) => (
        <span key={s.id}>
          {i > 0 && " · "}
          {s.id === current ? <b>{s.label}</b> : <Link href={s.href}>{s.label}</Link>}
        </span>
      ))}
    </span>
  );
}
