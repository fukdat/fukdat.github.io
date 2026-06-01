const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Slot {
  start: string;
  end: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  start: string;
  end: string;
  status: string;
}

export interface CreateBookingInput {
  resourceId: string;
  serviceId: string;
  startsAt: string;
  customerName: string;
  customerEmail: string;
}

interface ApiError {
  error?: { code?: string; message?: string };
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError;
    return body.error?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function getAvailability(
  resourceId: string,
  serviceId: string,
  day: string,
): Promise<Slot[]> {
  const url = `${BASE}/availability?resourceId=${encodeURIComponent(resourceId)}&serviceId=${encodeURIComponent(serviceId)}&day=${encodeURIComponent(day)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Slot[];
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const res = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Booking;
}
