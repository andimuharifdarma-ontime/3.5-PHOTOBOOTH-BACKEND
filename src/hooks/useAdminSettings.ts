'use client';

import useSWR from 'swr';

export type AdminSettings = Record<string, unknown>;

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  isPaymentEnabled?: boolean;
  canInputCapital?: boolean;
  initialCapital?: number;
};

export type AdminThemeSummary = {
  id: string;
  userName: string | null;
  name: string;
  previewUrl: string;
  description: string | null;
  tag: string | null;
  price: number;
  isActive: boolean;
  order: number;
  _count?: { frames: number };
};

export function useAdminSettings(userId?: string | null) {
  const key = userId ? `/api/admin/settings?userId=${userId}` : '/api/admin/settings';

  return useSWR<AdminSettings>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  });
}

export function useAdminUsers(enabled = true) {
  return useSWR<AdminUserSummary[]>(enabled ? '/api/admin/users' : null, {
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
  });
}

export function useAdminThemes(userName?: string | null, enabled = true) {
  const key =
    enabled && userName
      ? `/api/admin/themes?userName=${encodeURIComponent(userName)}`
      : enabled
        ? '/api/admin/themes'
        : null;

  return useSWR<AdminThemeSummary[]>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  });
}

export type ReportsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ReportTransaction = {
  id: string;
  user: string;
  frame: string;
  quantity: number;
  price: number;
  costPrice: number;
  date: string;
  status: string;
  revenue: number;
  cost: number;
  profit: number;
};

export type ReportsResponse = {
  transactions: ReportTransaction[];
  topFrames: Array<{ name: string; count: number; revenue: number }>;
  financialSummary: {
    totalRevenue: number;
    totalEstimatedCost: number;
    totalProfit: number;
    margin: number;
  };
  pagination: ReportsPagination;
};

export function buildReportsKey(params: {
  startDate?: string;
  endDate?: string;
  userName?: string;
  search?: string;
  page?: number;
  limit?: number;
  exportAll?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.userName) query.set('userName', params.userName);
  if (params.search) query.set('search', params.search);
  if (params.exportAll) {
    query.set('exportAll', '1');
  } else {
    query.set('page', String(params.page ?? 1));
    query.set('limit', String(params.limit ?? 25));
  }
  return `/api/admin/reports?${query.toString()}`;
}

export function useAdminReports(
  params: {
    startDate?: string;
    endDate?: string;
    userName?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  enabled = true,
) {
  const key = enabled ? buildReportsKey(params) : null;

  return useSWR<ReportsResponse>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 15_000,
    keepPreviousData: true,
  });
}
