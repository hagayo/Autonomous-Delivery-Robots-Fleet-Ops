export class TimeUtils {
  public static getRandomDuration(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  public static getTimestamp(): string {
    return new Date().toISOString();
  }

  public static isExpired(date: Date, durationMs: number): boolean {
    return Date.now() - date.getTime() > durationMs;
  }
}