export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private interval: NodeJS.Timeout | null = null;

  public startMonitoring(intervalMs: number = 1000): void {
    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.snapshots.push({
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        timestamp: Date.now()
      });
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  public detectMemoryLeak(threshold: number = 1.5): boolean {
    if (this.snapshots.length < 10) return false;

    const first10Avg = this.snapshots.slice(0, 10)
      .reduce((sum, s) => sum + s.heapUsed, 0) / 10;
    
    const last10Avg = this.snapshots.slice(-10)
      .reduce((sum, s) => sum + s.heapUsed, 0) / 10;

    return (last10Avg / first10Avg) > threshold;
  }

  public forceGC(): void {
    if (global.gc) {
      global.gc();
    } else {
      console.warn('Garbage collection is not available. Run tests with --expose-gc flag');
    }
  }

  public clear(): void {
    this.snapshots = [];
  }
}
