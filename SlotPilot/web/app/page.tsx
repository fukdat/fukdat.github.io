import BookingFlow from "@/components/BookingFlow";
import { RESOURCE_NAME } from "@/lib/config";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-16">
      <header className="mb-12 text-center">
        <p className="font-display text-sm tracking-[0.3em] text-clay">SLOTPILOT</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
          {RESOURCE_NAME}
        </h1>
        <p className="mt-4 max-w-md text-ink/60">
          Real-time availability, instant confirmation. No phone tag, no double-bookings.
        </p>
      </header>
      <BookingFlow />
      <footer className="mt-16 text-xs text-ink/40">
        Powered by SlotPilot · availability synced live from your calendar
      </footer>
    </main>
  );
}
