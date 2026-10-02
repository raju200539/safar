import type { Leg } from '@hyd/shared';

/**
 * Plain-language instruction per leg (SPEC §2.8).
 * Full i18n + unit tests land in M2. M0 keeps the pure-function shape.
 */
export function buildInstruction(leg: Leg): string {
  if (leg.mode === 'WALK') {
    const where = leg.to.name ? ` to ${leg.to.name}` : '';
    const dist =
      leg.distanceM != null ? ` (${Math.round(leg.distanceM)} m)` : '';
    return `Walk${where}${dist}.`;
  }
  const route = leg.route?.shortName ?? leg.route?.id ?? 'transit';
  const headsign = leg.headsign ? ` towards ${leg.headsign}` : '';
  const stops =
    leg.stopCount != null ? ` after ${leg.stopCount} stops` : '';
  const kind = leg.mode === 'METRO' ? 'metro' : 'bus';
  return `Board ${kind} ${route}${headsign} at ${leg.from.name}. Get off at ${leg.to.name}${stops}.`;
}
