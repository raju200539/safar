import { OtpPlanner } from './otp-planner';
import type { OtpClient } from './otp-client';

function node(mode: string, routeId: string, start: string): unknown {
  return {
    start,
    end: '2026-10-05T11:00:00+05:30',
    duration: 3600,
    walkDistance: 500,
    numberOfTransfers: 0,
    legs: [
      {
        mode,
        start: { scheduledTime: start },
        end: { scheduledTime: '2026-10-05T11:00:00+05:30' },
        duration: 3600,
        distance: 5000,
        headsign: 'X',
        from: { name: 'A', lat: 1, lon: 1, stop: { gtfsId: 'f:A', name: 'A' } },
        to: { name: 'B', lat: 2, lon: 2, stop: { gtfsId: 'f:B', name: 'B' } },
        route: { gtfsId: routeId, shortName: routeId, agency: { name: 'T' } },
        trip: { gtfsId: 't', tripHeadsign: 'X' },
        stopCalls: [],
        legGeometry: { points: '' },
      },
    ],
  };
}

describe('OtpPlanner fan-out', () => {
  it('merges bus-only and metro-only searches', async () => {
    const client = {
      query: async (_q: string, v: unknown): Promise<unknown> => {
        const modes = JSON.stringify(
          (v as { modes?: unknown }).modes ?? {},
        );
        if (modes.includes('SUBWAY') && !modes.includes('"BUS"')) {
          return {
            planConnection: {
              edges: [{ node: node('SUBWAY', 'hmrl:RED', '2026-10-05T10:05:00+05:30') }],
            },
          };
        }
        return {
          planConnection: {
            edges: [{ node: node('BUS', 'tgsrtc:218', '2026-10-05T10:00:00+05:30') }],
          },
        };
      },
    } as unknown as OtpClient;
    const out = await new OtpPlanner(client).plan({
      from: { lat: 17.3, lon: 78.4 },
      to: { lat: 17.4, lon: 78.5 },
    });
    const modes = out.map((i) => i.legs[0]?.mode).sort();
    // PlanTrip dedupes later; the planner returns the merged raw list.
    expect(modes).toEqual(['BUS', 'BUS', 'METRO']);
  });

  it('runs a single search when a mode family is requested', async () => {
    const seen: unknown[] = [];
    const client = {
      query: async (_q: string, v: unknown): Promise<unknown> => {
        seen.push((v as { modes?: unknown }).modes);
        return { planConnection: { edges: [] } };
      },
    } as unknown as OtpClient;
    await new OtpPlanner(client).plan({
      from: { lat: 17.3, lon: 78.4 },
      to: { lat: 17.4, lon: 78.5 },
      modes: 'metro',
    });
    expect(seen).toHaveLength(1);
    expect(JSON.stringify(seen[0])).toContain('SUBWAY');
    expect(JSON.stringify(seen[0])).not.toContain('BUS');
  });

  it('tolerates a failing sub-search', async () => {    let calls = 0;
    const client = {
      query: async (): Promise<unknown> => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
        return { planConnection: { edges: [] } };
      },
    } as unknown as OtpClient;
    const out = await new OtpPlanner(client).plan({
      from: { lat: 17.3, lon: 78.4 },
      to: { lat: 17.4, lon: 78.5 },
    });
    expect(out).toEqual([]);
  });
});
