import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { OverviewResponse } from '@medwatch/shared';

interface OverviewParams {
  from?: string;       // YYYY-MM
  to?: string;         // YYYY-MM
  asOf?: string;       // YYYY-MM-DD
  district?: string;
  compare?: 'prev' | 'yoy';
}

export function useOverview(params: OverviewParams = {}) {
  const p = new URLSearchParams();
  if (params.from)     p.set('from',     params.from);
  if (params.to)       p.set('to',       params.to);
  if (params.asOf)     p.set('asOf',     params.asOf);
  if (params.district) p.set('district', params.district);
  if (params.compare)  p.set('compare',  params.compare);

  const qs = p.toString();
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () => api.get<OverviewResponse>(`/analytics/overview${qs ? `?${qs}` : ''}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
