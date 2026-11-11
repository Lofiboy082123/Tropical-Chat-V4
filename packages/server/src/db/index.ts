import { IDatabaseDriver } from './driver.js';
import { SQLiteDatabaseDriver } from './sqlite.js';
import { runMigrations } from './migrations.js';
import { config } from '../config.js';

let dbInstance: IDatabaseDriver | null = null;

export async function getDatabase(): Promise<IDatabaseDriver> {
  if (!dbInstance) {
    if (config.db.dialect === 'sqlite') {
      dbInstance = new SQLiteDatabaseDriver(config.db.storage);
    } else {
      throw new Error(`Unsupported database dialect: ${config.db.dialect}`);
    }
    await dbInstance.connect();
    runMigrations(dbInstance);
  }
  return dbInstance;
}
