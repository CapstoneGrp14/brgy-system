import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface OverviewStats {
  month: string;
  months: string[];
  cards: {
    residents: number;
    documentsIssued: number;
    complaintsFiled: number;
    artaCompliance: number | null;
    chatbotQueries: number;
    chatbotResolvedRate: number;
  };
  complaintTrend: Array<{ month: string; filed: number; resolved: number }>;
  complaintCategories: Array<{ category: string; count: number }>;
  bookingBusyDays: Array<{ day: string; count: number }>;
  serviceDemand: Array<{ service: string; count: number }>;
  inventoryLevels: Array<{ name: string; stockQty: number; threshold: number }>;
  compliance: Array<{
    slaClass: string;
    filed: number;
    completed: number;
    onTime: number;
    rate: number | null;
    status: string;
  }>;
}

export interface ArtaRow {
  id: string;
  resident: string;
  type: string;
  title: string;
  slaClass: string;
  status: string;
  filedAt: string;
  dueAt: string;
  completedAt: string | null;
  onTime: boolean | null;
  overdueNow: boolean;
}

export interface AuditRow {
  id: string;
  at: string;
  actorLabel: string;
  action: string;
  target: string | null;
}

export function useOverview(month?: string) {
  return useQuery({
    queryKey: ['analytics', 'overview', month ?? 'current'],
    queryFn: async () =>
      (await api.get<OverviewStats>('/analytics/overview', { params: month ? { month } : {} })).data,
    refetchInterval: 60_000,
  });
}

export function useArtaReport(year?: number) {
  return useQuery({
    queryKey: ['analytics', 'arta-report', year ?? 'all'],
    queryFn: async () =>
      (await api.get<{ items: ArtaRow[]; years: number[] }>('/analytics/arta-report', { params: year ? { year } : {} })).data,
    refetchInterval: 60_000,
  });
}

export async function fetchArtaSummary(year?: number): Promise<string> {
  return (await api.get<{ draft: string }>('/analytics/arta-summary', { params: year ? { year } : {} })).data.draft;
}

export function useAuditLog(q: string) {
  return useQuery({
    queryKey: ['audit', q],
    queryFn: async () => (await api.get<AuditRow[]>('/audit', { params: q ? { q } : {} })).data,
    refetchInterval: 30_000,
  });
}

export async function fetchSummaryDraft(month?: string): Promise<string> {
  return (await api.get<{ draft: string }>('/analytics/summary', { params: month ? { month } : {} })).data.draft;
}

async function downloadCsv(path: string, filename: string): Promise<void> {
  const { data } = await api.get<Blob>(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadMonthlyReportCsv = (month: string) =>
  downloadCsv(`/analytics/report.csv?month=${month}`, `brgy591-report-${month}.csv`);
export const downloadArtaCsv = (year?: number) =>
  downloadCsv(`/analytics/arta-report.csv${year ? `?year=${year}` : ''}`, `arta-sla-report${year ? `-${year}` : ''}.csv`);
export const downloadAuditCsv = (q: string) =>
  downloadCsv(`/audit/export.csv${q ? `?q=${encodeURIComponent(q)}` : ''}`, 'audit-log.csv');
