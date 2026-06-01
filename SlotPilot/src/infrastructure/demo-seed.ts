import { Resource, Service } from '../domain/booking';

const ORG = 'org_demo';

/** Mon–Fri, 09:00–17:00 UTC. */
const WEEKDAY_HOURS = ([1, 2, 3, 4, 5] as const).map((weekday) => ({
  weekday,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

export const demoResources: readonly Resource[] = [
  {
    id: 'res_alex',
    organizationId: ORG,
    name: 'Alex (Stylist)',
    availabilityRules: WEEKDAY_HOURS,
  },
];

export const demoServices: readonly Service[] = [
  { id: 'svc_haircut', organizationId: ORG, name: 'Haircut', durationMinutes: 30 },
  { id: 'svc_color', organizationId: ORG, name: 'Coloring', durationMinutes: 90 },
];
