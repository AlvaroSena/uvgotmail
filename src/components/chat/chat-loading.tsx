import { Envelope } from "@/components/pixel/icons";

export function ChatLoading({ label = "Dialing up... please wait" }: { label?: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-win-gray font-verdana text-xs md:h-[600px]">
      <Envelope size="big" bob />
      <span>{label}</span>
    </div>
  );
}
