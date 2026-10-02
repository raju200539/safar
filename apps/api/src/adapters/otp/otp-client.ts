// Thin OTP GTFS-GraphQL HTTP client. Only place that knows OTP's URL,
// timeout and headers. All query text lives in gtfs-queries.ts,
// all shaping in mappers.ts.
export class OtpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl: string = process.env.OTP_URL ?? 'http://localhost:8080',
    timeoutMs = 15000,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  get url(): string {
    return this.baseUrl;
  }

  async query<T>(query: string, variables?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/otp/gtfs/v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // OTP honours this per-request timeout header (docs: GTFS GraphQL API).
        OTPTimeout: String(this.timeoutMs),
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`OTP HTTP ${res.status} on /otp/gtfs/v1`);
    }
    const body = (await res.json()) as {
      data?: T;
      errors?: Array<{ message?: string }>;
    };
    if (body.errors?.length) {
      throw new Error(
        `OTP GraphQL: ${body.errors.map((e) => e.message ?? '?').join('; ')}`,
      );
    }
    if (body.data == null) {
      throw new Error('OTP GraphQL: empty data');
    }
    return body.data;
  }

  /** Lightweight liveness probe for /health (no GraphQL needed). */
  async ping(timeoutMs = 2500): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
