import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import type { PaginatedResponse, StockRecord } from '@medwatch/shared';

export function useStockRecords(filters: { facilityId?: string; medicineId?: string; period?: string; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.facilityId) params.set('facilityId', filters.facilityId);
  if (filters.medicineId) params.set('medicineId', filters.medicineId);
  if (filters.period) params.set('period', filters.period);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));

  return useQuery({
    queryKey: ['stock-records', filters],
    queryFn: () => api.get<PaginatedResponse<StockRecord>>(`/stock-records?${params}`),
  });
}

export function useCreateStockRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StockRecord, '_id'>) => api.post<StockRecord>('/stock-records', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-records'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
