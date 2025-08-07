import { EventEmitter } from '@/utils/event-emitter';

export class TestEventCollector {
  private events: Array<{ event: string; data: any; timestamp: number }> = [];

  public attachToEmitter(emitter: EventEmitter, events: string[]): void {
    events.forEach(eventName => {
      emitter.on(eventName, (data) => {
        this.events.push({
          event: eventName,
          data,
          timestamp: Date.now()
        });
      });
    });
  }

  public getEvents(): Array<{ event: string; data: any; timestamp: number }> {
    return [...this.events];
  }

  public getEventCount(eventName: string): number {
    return this.events.filter(e => e.event === eventName).length;
  }

  public clear(): void {
    this.events = [];
  }
}

export function createMockTimer(): {
  currentTime: number;
  advance: (ms: number) => void;
  reset: () => void;
} {
  let currentTime = Date.now();
  const originalDateNow = Date.now;
  
  Date.now = () => currentTime;

  return {
    get currentTime() { return currentTime; },
    advance: (ms: number) => { currentTime += ms; },
    reset: () => {
      Date.now = originalDateNow;
      currentTime = Date.now();
    }
  };
}

export async function waitForCondition(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Condition timeout'));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}