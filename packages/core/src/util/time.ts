let mockClock: (() => Date) | null = null;

/**
 * Returns the current date/time.
 * Can be overridden in tests via setMockClock.
 */
export function now(): Date {
  if (mockClock) {
    return mockClock();
  }
  return new Date();
}

/**
 * Override the clock for deterministic testing.
 */
export function setMockClock(fn: (() => Date) | null): void {
  mockClock = fn;
}
