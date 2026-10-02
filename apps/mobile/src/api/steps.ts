import type { Leg } from '@hyd/shared';

export interface LegSteps {
  title: string;
  steps: string[];
}

type T = (key: string, vars?: Record<string, string | number>) => string;

function fmtDist(m: number | undefined, t: T): string {
  if (m == null) return '';
  return m < 1000 ? t('xMeters', { n: Math.round(m) }) : t('xKm', { n: (m / 1000).toFixed(1) });
}

/** Structured, imperative steps per leg (locale-aware via t). */
export function buildSteps(leg: Leg, t: T): LegSteps {
  if (leg.mode === 'WALK') {
    const d = leg.distanceM != null ? ` (${fmtDist(leg.distanceM, t)})` : '';
    return {
      title: `${t('stepWalk')}${d}`,
      steps: [`${t('stepWalkTo', { stop: leg.to.name })}`],
    };
  }
  const no = leg.route?.shortName ?? '';
  const kind = leg.mode === 'BUS' ? t('busWord') : t('metroWord');
  const steps: string[] = [
    t('stepBoard', { kind, no, stop: leg.from.name }),
  ];
  if (leg.stopCount != null && leg.stopCount > 0) {
    steps.push(
      t('stepRide', {
        n: leg.stopCount,
        head: leg.headsign ?? '',
      }),
    );
  }
  steps.push(t('stepAlight', { stop: leg.to.name }));
  return { title: `${kind} ${no}`.trim(), steps };
}
