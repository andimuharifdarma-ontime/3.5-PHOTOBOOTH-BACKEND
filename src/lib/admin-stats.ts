import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface DashboardStats {
  totalThemes: number;
  totalFrames: number;
  totalOrders: number;
  totalRevenue: number;
  totalPrints: number;
  pendingOrders: number;
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface StatsQueryParams {
  startDate?: string | null;
  endDate?: string | null;
  userRole: string;
  userEmail: string;
}

function buildDateWhereClause(startDateStr?: string | null, endDateStr?: string | null): Prisma.PrintOrderWhereInput {
  if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
    return {
      createdAt: {
        gte: new Date(new Date(startDateStr).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(endDateStr).setHours(23, 59, 59, 999)),
      },
    };
  }

  if (startDateStr && startDateStr.trim() !== '') {
    const date = new Date(startDateStr);
    return {
      createdAt: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lte: new Date(date.setHours(23, 59, 59, 999)),
      },
    };
  }

  return {};
}

async function resolveClientFilters(userRole: string, userEmail: string) {
  let orderWhereClause: Prisma.PrintOrderWhereInput = {};
  let themeWhereClause: Prisma.FrameThemeWhereInput = {};

  if (userRole === 'CLIENT') {
    const client = await prisma.adminUser.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true },
    });

    if (client) {
      orderWhereClause = {
        OR: [{ adminUserId: client.id }, { userName: client.name || '' }],
      };
      themeWhereClause = {
        userName: {
          equals: (client.name || '').toLowerCase(),
          mode: 'insensitive',
        },
      };
    }
  }

  return { orderWhereClause, themeWhereClause };
}

export async function getDashboardStats(params: StatsQueryParams): Promise<DashboardStats> {
  const dateWhere = buildDateWhereClause(params.startDate, params.endDate);
  const { orderWhereClause: clientOrderWhere, themeWhereClause } = await resolveClientFilters(
    params.userRole,
    params.userEmail,
  );

  const orderWhereClause: Prisma.PrintOrderWhereInput = {
    ...dateWhere,
    ...clientOrderWhere,
  };

  const paidStatusFilter: Prisma.PrintOrderWhereInput = {
    paymentStatus: { in: ['paid', 'printed'] },
  };

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalThemes,
    totalFrames,
    totalOrders,
    paidAgg,
    pendingOrders,
    annualStats,
  ] = await Promise.all([
    prisma.frameTheme.count({ where: themeWhereClause }),
    prisma.frame.count({ where: { theme: themeWhereClause } }),
    prisma.printOrder.count({ where: orderWhereClause }),
    prisma.printOrder.aggregate({
      where: { ...orderWhereClause, ...paidStatusFilter },
      _sum: { totalPrice: true, quantity: true },
    }),
    prisma.printOrder.count({
      where: { ...orderWhereClause, paymentStatus: 'pending' },
    }),
    prisma.printOrder.findMany({
      where: {
        ...clientOrderWhere,
        createdAt: { gte: twelveMonthsAgo },
        paymentStatus: { in: ['paid', 'printed'] },
      },
      select: { totalPrice: true, createdAt: true },
    }),
  ]);

  const totalRevenue = paidAgg._sum.totalPrice ?? 0;
  const totalPrints = paidAgg._sum.quantity ?? 0;

  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthRevenue = annualStats
      .filter((o) => o.createdAt >= mStart && o.createdAt <= mEnd)
      .reduce((sum, o) => sum + o.totalPrice, 0);

    monthlyRevenue.push({
      month: mStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      revenue: monthRevenue,
    });
  }

  return {
    totalThemes,
    totalFrames,
    totalOrders,
    totalRevenue,
    totalPrints,
    pendingOrders,
    monthlyRevenue,
  };
}
