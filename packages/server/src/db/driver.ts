export interface QueryResult<T = any> {
  rows: T[];
  changes?: number;
  lastInsertRowid?: number | bigint;
}

export interface IDatabaseDriver {
  connect(): Promise<void>;
  close(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): T[];
  get<T = any>(sql: string, params?: any[]): T | undefined;
  run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number | bigint };
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
}
