import type { Prisma } from '@prisma/client';

type ReportsFilterParams = {
  userRole: string;
  userEmail: string;
  sessionUserName?: string;
  userNameParam?: string | null;
  startDateStr?: string | null;
  endDateStr?: string | null;
  search?: string;
};

export async function buildReportsWhereClause(
  params: ReportsFilterParams,
  prisma: typeof import('@/lib/prisma').default,
): Promise<Prisma.PrintOrderWhereInput> {
  const whereClause: Prisma.PrintOrderWhereInput = {};

  if (params.userRole === 'CLIENT') {
    const client = await prisma.adminUser.findUnique({
      where: { email: params.userEmail },
      select: { id: true, name: true },
    });

    if (client) {
      whereClause.OR = [{ adminUserId: client.id }, { userName: client.name || '' }];
    } else if (params.sessionUserName) {
      whereClause.userName = params.sessionUserName;
    }
  } else if (
    (params.userRole === 'ADMIN' || params.userRole === 'KARYAWAN') &&
    params.userNameParam
  ) {
    const targetClient = await prisma.adminUser.findFirst({
      where: { name: params.userNameParam, role: 'CLIENT' },
      select: { id: true },
    });

    if (targetClient) {
      whereClause.OR = [{ adminUserId: targetClient.id }, { userName: params.userNameParam }];
    } else {
      whereClause.userName = params.userNameParam;
    }
  }

  if (params.startDateStr && params.endDateStr) {
    whereClause.createdAt = {
      gte: new Date(new Date(params.startDateStr).setHours(0, 0, 0, 0)),
      lte: new Date(new Date(params.endDateStr).setHours(23, 59, 59, 999)),
    };
  } else if (params.startDateStr) {
    const date = new Date(params.startDateStr);
    whereClause.createdAt = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lte: new Date(date.setHours(23, 59, 59, 999)),
    };
  }

  const search = params.search?.trim();
  if (search) {
    whereClause.AND = [
      ...(Array.isArray(whereClause.AND) ? whereClause.AND : whereClause.AND ? [whereClause.AND] : []),
      {
        OR: [
          { userName: { contains: search, mode: 'insensitive' } },
          { frameName: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  return whereClause;
}

export function formatReportTransaction(order: {
  id: string;
  userName: string;
  frameName: string;
  quantity: number;
  totalPrice: number;
  costPrice: number;
  createdAt: Date;
  paymentStatus: string;
}) {
  const isFinished = order.paymentStatus === 'paid' || order.paymentStatus === 'printed';
  const revenue = isFinished ? order.totalPrice : 0;
  const cost = isFinished ? order.quantity * (order.costPrice || 2500) : 0;

  return {
    id: order.id,
    user: order.userName,
    frame: order.frameName,
    quantity: order.quantity,
    price: order.totalPrice,
    costPrice: order.costPrice || 2500,
    date: order.createdAt,
    status: order.paymentStatus,
    revenue,
    cost,
    profit: revenue - cost,
  };
}

export function parseReportsPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '25', 10)),
  );
  return { page, limit, skip: (page - 1) * limit };
}
