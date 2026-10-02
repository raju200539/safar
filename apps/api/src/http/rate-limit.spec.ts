import { reportRateLimit, resetReportRateLimit } from './rate-limit';

describe('reportRateLimit', () => {
  beforeEach(() => resetReportRateLimit());

  it('allows 5 submits then blocks', () => {
    for (let i = 0; i < 5; i++) {
      expect(reportRateLimit('dev-1', 1000 + i)).toBe(true);
    }
    expect(reportRateLimit('dev-1', 2000)).toBe(false);
  });

  it('is per device', () => {
    for (let i = 0; i < 5; i++) reportRateLimit('a', i);
    expect(reportRateLimit('b', 10)).toBe(true);
  });

  it('resets after the window', () => {
    for (let i = 0; i < 5; i++) reportRateLimit('dev-1', 0);
    expect(reportRateLimit('dev-1', 61 * 60 * 1000)).toBe(true);
  });
});
