import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "You've Got a Mail",
  description: "A little message can make someone's day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
