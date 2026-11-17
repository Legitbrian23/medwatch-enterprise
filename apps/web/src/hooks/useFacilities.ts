import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { HealthFacility, PaginatedResponse } from '@medwatch/shared';

export function useFacilities(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['facilities', page, limit],
    queryFn: () => api.get<PaginatedResponse<HealthFacility>>(`/facilities?page=${page}&limit=${limit}`),
  });
}

export function useNearestFacility(params: { medicineId: string; lng: number; lat: number; minQty: number } | null) {
  return useQuery({
    queryKey: ['facilities', 'nearest', params],
    queryFn: () => {
      if (!params) return Promise.resolve([]);
      const q = new URLSearchParams({
        medicineId: params.medicineId,
        lng: String(params.lng),
        lat: String(params.lat),
        minQty: String(params.minQty),
      });
      return api.get<HealthFacility[]>(`/facilities/nearest?${q}`);
    },
    enabled: !!params,
  });
}
