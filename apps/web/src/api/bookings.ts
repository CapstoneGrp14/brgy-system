import type { BookingConflict, BookingDto, BookingSlotDto, FacilityDto } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useBookingSlots() {
  return useQuery({
    queryKey: ['bookings', 'slots'],
    queryFn: async () => (await api.get<BookingSlotDto[]>('/bookings/slots')).data,
    staleTime: 5 * 60_000,
  });
}

export function useBookingConfig() {
  return useQuery({
    queryKey: ['bookings', 'config'],
    queryFn: async () =>
      (await api.get<{ facilities: FacilityDto[]; slots: BookingSlotDto[] }>('/bookings/config')).data,
  });
}

const invalidateBookings = (qc: ReturnType<typeof useQueryClient>) =>
  void qc.invalidateQueries({ queryKey: ['bookings'] });

export function useBookingAdmin() {
  const qc = useQueryClient();
  const addFacility = useMutation({
    mutationFn: async (input: { name: string; type: 'FACILITY' | 'EQUIPMENT' }) =>
      (await api.post('/bookings/facilities', input)).data,
    onSuccess: () => invalidateBookings(qc),
  });
  const toggleFacility = useMutation({
    mutationFn: async (id: string) => (await api.post(`/bookings/facilities/${id}/toggle`)).data,
    onSuccess: () => invalidateBookings(qc),
  });
  const setBlock = useMutation({
    mutationFn: async (input: { id: string; slot: string; title?: string; remove?: boolean }) =>
      (await api.post(`/bookings/facilities/${input.id}/blocks`, input)).data,
    onSuccess: () => invalidateBookings(qc),
  });
  const addSlot = useMutation({
    mutationFn: async (input: { label: string; isOffPeak: boolean }) =>
      (await api.post('/bookings/slots', input)).data,
    onSuccess: () => invalidateBookings(qc),
  });
  const toggleSlot = useMutation({
    mutationFn: async (id: string) => (await api.post(`/bookings/slots/${id}/toggle`)).data,
    onSuccess: () => invalidateBookings(qc),
  });
  return { addFacility, toggleFacility, setBlock, addSlot, toggleSlot };
}

export function useFacilities() {
  return useQuery({
    queryKey: ['bookings', 'facilities'],
    queryFn: async () => (await api.get<FacilityDto[]>('/bookings/facilities')).data,
    staleTime: 5 * 60_000,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => (await api.get<BookingDto[]>('/bookings/mine')).data,
  });
}

export interface CreateBookingInput {
  facilityId: string;
  date: string;
  timeSlot: string;
  purpose?: string;
  fromSuggestion?: boolean;
  /** A minor in the caller's household; re-derived server-side, never trusted. */
  beneficiaryCensusRecordId?: string;
}

/** Extracts the 409 conflict payload, or null for other errors. */
export function conflictFromError(err: unknown): BookingConflict | null {
  const data = (err as { response?: { status?: number; data?: BookingConflict } })?.response;
  if (data?.status !== 409) return null;
  const payload = data.data as BookingConflict | { message: BookingConflict };
  return typeof payload?.message === 'object' ? (payload.message as BookingConflict) : (payload as BookingConflict);
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) =>
      (await api.post<BookingDto>('/bookings', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useBookingsQueue() {
  return useQuery({
    queryKey: ['bookings', 'queue'],
    queryFn: async () => (await api.get<BookingDto[]>('/bookings/queue')).data,
    refetchInterval: 30_000,
  });
}

export function useDecideBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; useSuggestion?: boolean }) =>
      (await api.post<BookingDto>(`/bookings/${input.id}/decide`, input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
