"use client";

import { signOff } from "@/actions/auth";
import { clearPlayedThisSession, stopDialup } from "@/lib/dialup-sound";

/** Sign Off link-button. Clears the "already dialed" flag so the next sign on plays the modem again. */
export function SignOffButton({ className = "", label = "Sign Off" }: { className?: string; label?: string }) {
  return (
    <form
      action={signOff}
      onSubmit={() => {
        stopDialup();
        clearPlayedThisSession();
      }}
      className="inline"
    >
      <button type="submit" className={`cursor-pointer border-0 bg-transparent p-0 underline ${className}`}>
        {label}
      </button>
    </form>
  );
}
