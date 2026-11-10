import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDatabaseDriver } from './driver.js';

export class SQLiteDatabaseDriver implements IDatabaseDriver {
  private db: Database.Database | null = null;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async connect(): Promise<void> {
    if (this.filePath !== ':memory:') {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new Database(this.filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  exec(sql: string): void {
    if (!this.db) throw new Error('Database not connected');
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not connected');
    const txn = this.db.transaction(fn);
    return txn();
  }
}
