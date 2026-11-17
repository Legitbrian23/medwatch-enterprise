import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import type { PaginatedResponse, StockRequest } from '@medwatch/shared';

interface RequestFilters {
  status?: string;
  facilityId?: string;
  district?: string;
  page?: number;
  limit?: number;
}

export function useStockRequests(filters: RequestFilters | string = {}) {
  const f = typeof filters === 'string' ? { status: filters } : filters;
  const params = new URLSearchParams({ page: String(f.page ?? 1), limit: String(f.limit ?? 20) });
  if (f.status) params.set('status', f.status);
  if (f.facilityId) params.set('facilityId', f.facilityId);
  if (f.district) params.set('district', f.district);

  return useQuery({
    queryKey: ['stock-requests', f],
    queryFn: () => api.get<PaginatedResponse<StockRequest>>(`/stock-requests?${params}`),
  });
}

export function useCreateStockRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StockRequest, '_id'>) =>
      api.post<StockRequest>('/stock-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-requests'] }),
  });
}

export function useEscalatePending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (before: string) =>
      api.post<{ modifiedCount: number }>(`/stock-requests/escalate-pending?before=${before}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-requests'] }),
  });
}
