/**
 * Admin Audit Logger
 * 
 * Logs all important admin actions to the database for security tracking.
 * Records WHO did WHAT to WHICH resource and WHEN.
 */

import prisma from '@/lib/prisma';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SETTINGS_CHANGE'
  | 'PAYMENT_UPDATE';

export interface AuditLogEntry {
  /** Admin user ID performing the action */
  userId: string;
  /** Admin user email */
  userEmail: string;
  /** Type of action performed */
  action: AuditAction;
  /** Target resource type (e.g., 'theme', 'frame', 'user', 'settings') */
  resource: string;
  /** ID of the target resource */
  resourceId?: string;
  /** Human-readable description */
  details: string;
  /** IP address of the requester */
  ipAddress?: string;
}

/**
 * Extract client IP from request headers.
 */
function getIpFromRequest(request?: Request): string {
  if (!request) return 'unknown';
  const headers = new Headers(request.headers);
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Log an admin action to the database.
 * 
 * This is fire-and-forget — errors are caught and logged to console
 * so they never break the main request flow.
 * 
 * @example
 * ```ts
 * await logAuditEvent({
 *   userId: session.user.id,
 *   userEmail: session.user.email,
 *   action: 'DELETE',
 *   resource: 'frame',
 *   resourceId: frameId,
 *   details: 'Deleted frame "Vintage Classic"',
 * });
 * ```
 */
export async function logAuditEvent(entry: AuditLogEntry, request?: Request): Promise<void> {
  try {
    const ipAddress = entry.ipAddress || getIpFromRequest(request);

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        details: entry.details,
        ipAddress,
      },
    });
  } catch (error) {
    // Never let audit logging break the main request
    console.error('[AuditLog] Failed to write audit log:', error);
  }
}

/**
 * Helper to create audit log entry from a session object.
 */
export function createAuditEntry(
  session: { user: any },
  action: AuditAction,
  resource: string,
  resourceId: string | undefined,
  details: string
): AuditLogEntry {
  return {
    userId: session.user?.id || 'unknown',
    userEmail: session.user?.email || 'unknown',
    action,
    resource,
    resourceId,
    details,
  };
}
