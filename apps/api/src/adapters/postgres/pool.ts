import { Pool } from 'pg';

let pool: Pool | null | undefined;

function connectionString(): string | undefined {
  return process.env.DATABASE_URL;
}

/** Lazy singleton. Null when DATABASE_URL is unset (API still boots). */
export function dbPool(): Pool | null {
  if (pool !== undefined) return pool;
  const cs = connectionString();
  if (!cs) {
    pool = null;
    return pool;
  }
  pool = new Pool({ connectionString: cs, max: 5 });
  return pool;
}

export async function dbPing(timeoutMs = 2000): Promise<boolean> {
  const p = dbPool();
  if (!p) return false;
  try {
    await Promise.race([
      p.query('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db ping timeout')), timeoutMs),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}
