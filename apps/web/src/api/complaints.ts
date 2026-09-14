import type { ComplaintDto, ComplaintStatus, ComplaintsQueueResponse } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useMyComplaints() {
  return useQuery({
    queryKey: ['complaints', 'mine'],
    queryFn: async () => (await api.get<ComplaintDto[]>('/complaints/mine')).data,
  });
}

export function useFileComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      respondentName: string;
      description: string;
      category: string;
      contactNumber?: string;
      evidence?: File | null;
    }) => {
      const form = new FormData();
      form.append('respondentName', input.respondentName);
      form.append('description', input.description);
      form.append('category', input.category);
      if (input.contactNumber) form.append('contactNumber', input.contactNumber);
      if (input.evidence) form.append('evidence', input.evidence);
      return (await api.post<ComplaintDto>('/complaints', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}

export function useComplaintsQueue() {
  return useQuery({
    queryKey: ['complaints', 'queue'],
    queryFn: async () => (await api.get<ComplaintsQueueResponse>('/complaints/queue')).data,
    refetchInterval: 30_000,
  });
}

export type ComplaintActionsMap = Partial<
  Record<ComplaintStatus, Array<{ actionText: string; next: ComplaintStatus }>>
>;

export function useComplaintActions() {
  return useQuery({
    queryKey: ['complaints', 'actions'],
    queryFn: async () => (await api.get<ComplaintActionsMap>('/complaints/actions')).data,
    staleTime: Infinity,
  });
}

export function useEncodeBlotter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { caseTitle: string; category: string; description: string; respondentName: string }) =>
      (await api.post<ComplaintDto>('/complaints/blotter', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}

export interface LuponAssignee {
  fullName: string;
  position: string | null;
}

/** Active staff (employee + admin) eligible to mediate. Replaces the old
 *  hardcoded name list, so newly invited/promoted staff show up right away. */
export function useLuponAssignees() {
  return useQuery({
    queryKey: ['complaints', 'assignees'],
    queryFn: async () => (await api.get<LuponAssignee[]>('/complaints/assignees')).data,
    staleTime: 60_000,
  });
}

export function useAssignLupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; luponAssignee: string }) =>
      (await api.post(`/complaints/${input.id}/assign`, { luponAssignee: input.luponAssignee })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}

export function useAdvanceComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; next: ComplaintStatus }) =>
      (await api.post<ComplaintDto>(`/complaints/${input.id}/advance`, { next: input.next })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}
