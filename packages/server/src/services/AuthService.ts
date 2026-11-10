import { IDatabaseDriver } from '../db/driver.js';
import { User, Permission, RoleName, AuthSession } from '@tcc/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { AuditService } from './AuditService.js';

export class AuthService {
  constructor(private db: IDatabaseDriver, private audit: AuditService) {}

  getUserById(id: string): User | null {
    const row = this.db.get<any>(
      `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [id]
    );
    if (!row) return null;
    return this.mapUserRow(row);
  }

  getUserByUsername(username: string): (User & { passwordHash: string; failedAttempts: number; lockedUntil: string | null }) | null {
    const row = this.db.get<any>(
      `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ?`,
      [username]
    );
    if (!row) return null;
    return {
      ...this.mapUserRow(row),
      passwordHash: row.password_hash,
      failedAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until,
    };
  }

  async authenticate(username: string, passwordPlain: string, ipAddress: string, userAgent: string): Promise<AuthSession> {
    const record = this.getUserByUsername(username);

    if (!record) {
      this.recordLoginAttempt(null, username, ipAddress, userAgent, false, 'User not found');
      throw new Error('Invalid username or password');
    }

    if (!record.isActive) {
      this.recordLoginAttempt(record.id, username, ipAddress, userAgent, false, 'Account disabled');
      throw new Error('Account disabled. Contact administrator.');
    }

    if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
      this.recordLoginAttempt(record.id, username, ipAddress, userAgent, false, 'Account temporarily locked');
      throw new Error('Account is temporarily locked due to multiple failed login attempts.');
    }

    const isValid = bcrypt.compareSync(passwordPlain, record.passwordHash);
    if (!isValid) {
      const failed = record.failedAttempts + 1;
      let lockedUntil = null;
      if (failed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      this.db.run(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = datetime('now') WHERE id = ?`,
        [failed, lockedUntil, record.id]
      );
      this.recordLoginAttempt(record.id, username, ipAddress, userAgent, false, 'Invalid credentials');
      throw new Error('Invalid username or password');
    }

    this.db.run(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?`,
      [record.id]
    );

    this.recordLoginAttempt(record.id, username, ipAddress, userAgent, true);

    const user = this.getUserById(record.id)!;
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.roleName, permissions: user.permissions },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    const decoded = jwt.decode(token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    this.audit.log({
      actorId: user.id,
      actorUsername: user.username,
      action: 'USER_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      ipAddress,
      result: 'SUCCESS',
    });

    return { token, user, expiresAt };
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch {
      return null;
    }
  }

  private recordLoginAttempt(
    userId: string | null,
    username: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): void {
    const id = uuidv4();
    this.db.run(
      `INSERT INTO login_history (id, user_id, username, ip_address, user_agent, success, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, username, ipAddress, userAgent, success ? 1 : 0, failureReason || null]
    );
  }

  private mapUserRow(row: any): User {
    const permRows = this.db.query<{ permission: Permission }>(
      `SELECT permission FROM role_permissions WHERE role_id = ?`,
      [row.role_id]
    );
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      roleId: row.role_id,
      roleName: row.role_name as RoleName,
      permissions: permRows.map((p) => p.permission),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }
}
