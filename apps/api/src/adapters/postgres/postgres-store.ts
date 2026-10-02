// M5: Postgres-backed ReportStore. Stub for M0 layering.
import type { ReportStore } from '../../ports/report-store';

export class PostgresStore implements ReportStore {
  async add(): Promise<never> {
    throw new Error('PostgresStore lands in M5.');
  }
  async recent(): Promise<never> {
    throw new Error('PostgresStore lands in M5.');
  }
}
