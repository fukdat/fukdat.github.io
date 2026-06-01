"use client";

import { useState } from "react";

import { Booking, Slot, createBooking, getAvailability } from "@/lib/api";
import { RESOURCE_ID, SERVICES, ServiceOption } from "@/lib/config";

type Step = "service" | "date" | "slot" | "details" | "done";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

const STEP_INDEX: Record<Step, number> = { service: 0, date: 1, slot: 2, details: 3, done: 4 };

export default function BookingFlow() {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<ServiceOption | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("service");
    setService(null);
    setDay(null);
    setSlots([]);
    setSlot(null);
    setName("");
    setEmail("");
    setBooking(null);
    setError(null);
  };

  const chooseService = (s: ServiceOption) => {
    setService(s);
    setStep("date");
  };

  const chooseDay = async (d: string) => {
    if (!service) return;
    setDay(d);
    setStep("slot");
    setLoading(true);
    setError(null);
    try {
      setSlots(await getAvailability(RESOURCE_ID, service.id, d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load availability");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!service || !slot) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createBooking({
        resourceId: RESOURCE_ID,
        serviceId: service.id,
        startsAt: slot.start,
        customerName: name.trim(),
        customerEmail: email.trim(),
      });
      setBooking(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canConfirm = name.trim().length > 0 && emailValid && !loading;

  return (
    <div className="w-full max-w-xl">
      <Stepper current={STEP_INDEX[step]} />

      <div className="mt-6 rounded-3xl border border-sand bg-cream/80 p-7 shadow-[0_30px_60px_-40px_rgba(31,26,23,0.45)] backdrop-blur">
        {error && (
          <p className="mb-5 rounded-xl bg-clay/10 px-4 py-3 text-sm text-claydark">{error}</p>
        )}

        {step === "service" && (
          <section>
            <Heading kicker="Step one" title="Choose your service" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseService(s)}
                  className="group rounded-2xl border border-sand bg-white/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-clay hover:shadow-md"
                >
                  <p className="font-display text-xl text-ink">{s.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{s.blurb}</p>
                  <p className="mt-4 text-sm font-medium text-clay">{s.durationMinutes} min →</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "date" && service && (
          <section>
            <BackLink onClick={() => setStep("service")} />
            <Heading kicker="Step two" title="Pick a day" />
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {nextDays(14).map((d) => {
                const value = ymd(d);
                const selected = value === day;
                return (
                  <button
                    key={value}
                    onClick={() => chooseDay(value)}
                    className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-3 py-3 transition ${
                      selected ? "border-clay bg-clay text-cream" : "border-sand bg-white/60 hover:border-clay"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wide opacity-70">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="mt-1 font-display text-lg">{d.getDate()}</span>
                    <span className="text-xs opacity-70">
                      {d.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "slot" && service && day && (
          <section>
            <BackLink onClick={() => setStep("date")} />
            <Heading kicker="Step three" title={`Available · ${dayLabel(day)}`} />
            {loading ? (
              <p className="mt-6 text-sm text-ink/50">Loading openings…</p>
            ) : slots.length === 0 ? (
              <p className="mt-6 text-sm text-ink/60">
                No openings that day. Try another — Alex works weekdays, 9–5.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => {
                      setSlot(s);
                      setStep("details");
                    }}
                    className="rounded-xl border border-sand bg-white/60 py-2.5 text-sm font-medium transition hover:border-clay hover:bg-clay hover:text-cream"
                  >
                    {timeLabel(s.start)}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "details" && service && slot && day && (
          <section>
            <BackLink onClick={() => setStep("slot")} />
            <Heading kicker="Almost there" title="Your details" />
            <div className="mt-4 rounded-2xl bg-sand/60 px-4 py-3 text-sm text-ink/80">
              <strong className="font-medium">{service.name}</strong> · {dayLabel(day)} ·{" "}
              {timeLabel(slot.start)}–{timeLabel(slot.end)}
            </div>
            <div className="mt-5 space-y-3">
              <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" />
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="jane@example.com"
                type="email"
              />
            </div>
            <button
              onClick={confirm}
              disabled={!canConfirm}
              className="mt-6 w-full rounded-full bg-clay py-3 font-medium text-cream transition hover:bg-claydark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Confirming…" : "Confirm booking"}
            </button>
          </section>
        )}

        {step === "done" && booking && service && (
          <section className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss/20 text-2xl text-moss">
              ✓
            </div>
            <h2 className="mt-4 font-display text-2xl text-ink">You&apos;re booked</h2>
            <p className="mt-2 text-sm text-ink/70">
              {service.name} with {RESOURCE_ID === "res_alex" ? "Alex" : "your stylist"} on{" "}
              {dayLabel(ymd(new Date(booking.start)))} at {timeLabel(booking.start)}.
            </p>
            <p className="mt-1 text-xs text-ink/40">Confirmation #{booking.id.slice(0, 8)}</p>
            <button
              onClick={reset}
              className="mt-6 rounded-full border border-clay px-6 py-2.5 text-sm font-medium text-clay transition hover:bg-clay hover:text-cream"
            >
              Book another
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-clay">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl text-ink">{title}</h2>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-3 text-sm text-ink/50 transition hover:text-clay">
      ← Back
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-sand bg-white/70 px-4 py-2.5 text-ink outline-none transition focus:border-clay"
      />
    </label>
  );
}

function Stepper({ current }: { current: number }) {
  const labels = ["Service", "Day", "Time", "Details"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition ${
              i <= current ? "bg-clay text-cream" : "bg-sand text-ink/40"
            }`}
          >
            {i + 1}
          </span>
          {i < labels.length - 1 && (
            <span className={`h-px flex-1 ${i < current ? "bg-clay" : "bg-sand"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
