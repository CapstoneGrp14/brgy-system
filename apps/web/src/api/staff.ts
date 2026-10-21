import type { StaffModule } from '@brgy/shared';
import type { Role, StaffInviteRow } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface StaffMember {
  /** Modules this account may use; null = unrestricted. Admins are always null. */
  allowedModules: StaffModule[] | null;
  id: string;
  fullName: string;
  email: string;
  role: Role;
  position: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () =>
      (await api.get<{ staff: StaffMember[]; invites: StaffInviteRow[] }>('/staff')).data,
  });
}

export interface StaffInput {
  email: string;
  fullName: string;
  role: 'EMPLOYEE' | 'ADMIN';
  position: string;
}

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffInput) => (await api.post('/staff/invites', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function usePromoteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffInput) => (await api.post('/staff/promote', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useDemoteStaff() {
  const qc = useQueryClient();
  return useMutation({
    /** `linked: false` = no census record under this name, so the account
     *  becomes a resident in name only (no verification, no services). */
    mutationFn: async (email: string) =>
      (await api.post<{ ok: boolean; linked: boolean }>('/staff/demote', { email })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

/** Set an employee's module grant. null restores unrestricted access. */
export function useSetStaffModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; modules: StaffModule[] | null }) =>
      (await api.post(`/staff/${input.id}/modules`, { modules: input.modules })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/staff/invites/${id}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
