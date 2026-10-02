import type { Leg } from '@hyd/shared';

// Plain-language instructions (SPEC §2.8). Pure function; templates are
// i18n keys so Telugu can be added without touching callers.
export type InstructionLocale = 'en' | 'te';

function dist(m: number | undefined, locale: InstructionLocale): string {
  if (m == null) return locale === 'te' ? 'కొంత దూరం' : 'a short way';
  if (m < 1000) return locale === 'te' ? `${m} మీ` : `${m} m`;
  const km = (m / 1000).toFixed(1);
  return locale === 'te' ? `${km} కిమీ` : `${km} km`;
}

export function buildInstruction(
  leg: Leg,
  locale: InstructionLocale = 'en',
): string {
  const te = locale === 'te';
  if (leg.mode === 'WALK') {
    const where = leg.to.name ? ` ${te ? 'వరకు' : 'to'} ${leg.to.name}` : '';
    return te
      ? `${dist(leg.distanceM, locale)}${where} నడవండి.`
      : `Walk ${dist(leg.distanceM, locale)}${where}.`;
  }
  const no = leg.route?.shortName ?? leg.route?.id ?? (te ? 'బస్సు' : 'bus');
  const headsign = leg.headsign ?? (te ? 'గమ్యస్థానం' : 'destination');
  const n = leg.stopCount ?? 0;
  const stops =
    n > 0
      ? te
        ? ` ${n} స్టాపుల తర్వాత`
        : ` after ${n} stop${n === 1 ? '' : 's'}`
      : '';
  if (leg.mode === 'METRO') {
    return te
      ? `${leg.from.name} నుండి ${headsign} వైపు మెట్రో ఎక్కండి. ${leg.to.name} వద్ద${stops} దిగండి.`
      : `Take the metro towards ${headsign} from ${leg.from.name}. Get off at ${leg.to.name}${stops}.`;
  }
  return te
    ? `${leg.from.name} వద్ద ${headsign} వైపు వెళ్లే ${no} బస్సు ఎక్కండి. ${leg.to.name} వద్ద${stops} దిగండి.`
    : `Board bus ${no} towards ${headsign} at ${leg.from.name}. Get off at ${leg.to.name}${stops}.`;
}
