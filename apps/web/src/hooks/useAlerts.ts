import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import type { Alert, PaginatedResponse } from '@medwatch/shared';

interface AlertFilters {
  type?: string;
  severity?: string;
  resolved?: boolean;
  facilityId?: string;
  district?: string;
  page?: number;
  limit?: number;
}

export function useAlerts(filters: AlertFilters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.resolved !== undefined) params.set('resolved', String(filters.resolved));
  if (filters.facilityId) params.set('facilityId', filters.facilityId);
  if (filters.district) params.set('district', filters.district);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));

  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => api.get<PaginatedResponse<Alert>>(`/alerts?${params}`),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Alert>(`/alerts/${id}/resolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
