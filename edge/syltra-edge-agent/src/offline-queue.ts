// In-memory outbox for MQTT publishes made while disconnected from the broker.
// MVP scope note: this queue is memory-only and is lost on process restart. A
// production hub should back this with local disk storage (SQLite/file) before
// shipping hardware — see section 38 (Offline Mode) and section 52 (local database).
export class OfflineQueue<T> {
  private readonly items: T[] = [];

  constructor(private readonly maxSize = 1000) {}

  push(item: T): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift();
    }
    this.items.push(item);
  }

  drain(): T[] {
    const drained = [...this.items];
    this.items.length = 0;
    return drained;
  }

  get size(): number {
    return this.items.length;
  }
}
