import type { NewReport, Report } from '@hyd/shared';

export interface ReportStore {
  add(r: NewReport): Promise<Report>;
  recent(filter: {
    stopId?: string;
    routeId?: string;
    sinceMinutes: number;
  }): Promise<Report[]>;
}
