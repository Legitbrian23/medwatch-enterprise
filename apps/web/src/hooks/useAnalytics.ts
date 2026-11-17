import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { BelowReorderRow, ExpiringBatch, StockoutByDistrict } from '@medwatch/shared';

export function useStockoutsByDistrict() {
  return useQuery({
    queryKey: ['analytics', 'stockout-days-by-district'],
    queryFn: () => api.get<StockoutByDistrict[]>('/analytics/stockout-days-by-district'),
  });
}

export function useUnresolvedStockouts() {
  return useQuery({
    queryKey: ['analytics', 'stockouts'],
    queryFn: () => api.get<unknown[]>('/analytics/stockouts'),
  });
}

export function useExpiringBatches(days = 90, asOf?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (asOf) params.set('asOf', asOf);
  return useQuery({
    queryKey: ['analytics', 'expiring-batches', days, asOf],
    queryFn: () => api.get<ExpiringBatch[]>(`/analytics/expiring-batches?${params}`),
  });
}

export function useBelowReorder() {
  return useQuery({
    queryKey: ['analytics', 'below-reorder'],
    queryFn: () => api.get<BelowReorderRow[]>('/analytics/below-reorder'),
  });
}
