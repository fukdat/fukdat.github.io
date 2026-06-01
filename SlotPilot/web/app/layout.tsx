import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlotPilot — Book your appointment",
  description: "Real-time availability and instant booking for service businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
