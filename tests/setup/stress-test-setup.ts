// Global test setup for stress tests
beforeAll(() => {
  // Increase timeout for all stress tests
  jest.setTimeout(60000);
  
  // Mock timers if needed
  jest.useFakeTimers();
  
  // Set up memory monitoring
  if (!global.gc) {
    console.warn('⚠️  Garbage collection not available. Run with --expose-gc for accurate memory tests');
  }
});

afterAll(() => {
  jest.useRealTimers();
});

expect.extend({
  toBeWithinMemoryThreshold(received: number, threshold: number) {
    const pass = received < threshold;
    
    return {
      message: () => 
        pass 
          ? `Expected memory usage ${received} to exceed threshold ${threshold}`
          : `Memory usage ${received} bytes exceeded threshold ${threshold} bytes`,
      pass
    };
  },

  toCompleteWithinTimeframe(received: number, expected: number, tolerance: number = 1.2) {
    const pass = received <= (expected * tolerance);
    
    return {
      message: () =>
        pass
          ? `Expected duration ${received}ms to exceed ${expected * tolerance}ms`
          : `Operation took ${received}ms, expected max ${expected * tolerance}ms`,
      pass
    };
  }
});

// Add custom types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinMemoryThreshold(threshold: number): R;
      toCompleteWithinTimeframe(expected: number, tolerance?: number): R;
    }
  }
}