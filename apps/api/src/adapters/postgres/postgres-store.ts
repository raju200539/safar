import type { NewReport, Report } from '@hyd/shared';
import type { ReportStore } from '../../ports/report-store';
import { dbPool } from './pool';

const RECENT_LIMIT = 50;

interface ReportRow {
  id: string;
  type: Report['type'];
  route_id: string | null;
  stop_id: string | null;
  note: string | null;
  created_at: Date;
}

function toReport(r: ReportRow): Report {
  const out: Report = {
    id: r.id,
    type: r.type,
    createdAt: r.created_at.toISOString(),
  };
  if (r.route_id) out.routeId = r.route_id;
  if (r.stop_id) out.stopId = r.stop_id;
  if (r.note) out.note = r.note;
  return out;
}

function requirePool(): NonNullable<ReturnType<typeof dbPool>> {
  const p = dbPool();
  if (!p) {
    const err = new Error('Report database is not configured') as Error & {
      code?: string;
      status?: number;
    };
    err.code = 'STORE_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  return p;
}

export class PostgresStore implements ReportStore {
  async add(r: NewReport): Promise<Report> {
    const p = requirePool();
    const res = await p.query<ReportRow>(
      `INSERT INTO reports (type, route_id, stop_id, note, device_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, route_id, stop_id, note, created_at`,
      [r.type, r.routeId ?? null, r.stopId ?? null, r.note ?? null, r.deviceId],
    );
    const row = res.rows[0];
    if (!row) throw new Error('Insert returned no row');
    return toReport(row);
  }

  async recent(filter: {
    stopId?: string;
    routeId?: string;
    sinceMinutes: number;
  }): Promise<Report[]> {
    const p = requirePool();
    const conds: string[] = ['created_at > now() - ($1 || \' minutes\')::interval'];
    const params: Array<string | number> = [String(filter.sinceMinutes)];
    if (filter.stopId) {
      params.push(filter.stopId);
      conds.push(`stop_id = $${params.length}`);
    }
    if (filter.routeId) {
      params.push(filter.routeId);
      conds.push(`route_id = $${params.length}`);
    }
    const res = await p.query<ReportRow>(
      `SELECT id, type, route_id, stop_id, note, created_at FROM reports
       WHERE ${conds.join(' AND ')}
       ORDER BY created_at DESC LIMIT ${RECENT_LIMIT}`,
      params,
    );
    return res.rows.map(toReport);
  }
}
