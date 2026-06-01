// Mirrors the SlotPilot backend demo seed (resource + services).
export const RESOURCE_ID = "res_alex";
export const RESOURCE_NAME = "Alex · Studio Lumière";

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  blurb: string;
}

export const SERVICES: ServiceOption[] = [
  { id: "svc_haircut", name: "Haircut", durationMinutes: 30, blurb: "Wash, cut & style" },
  { id: "svc_color", name: "Coloring", durationMinutes: 90, blurb: "Full colour treatment" },
];
