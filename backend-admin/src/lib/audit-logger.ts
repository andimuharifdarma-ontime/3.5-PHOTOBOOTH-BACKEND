import prisma from '@/lib/prisma';

export interface AuditEvent {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

export async function logAuditEvent(event: AuditEvent, request?: Request) {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        userId: event.userId,
        userEmail: event.userEmail,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details,
        ipAddress: ipAddress.toString(),
        userAgent: userAgent.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}