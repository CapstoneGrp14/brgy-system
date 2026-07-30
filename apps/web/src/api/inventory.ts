import type { InventoryCategory, InventoryItemDto, RequestDto } from '@brgy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useAvailableItems(category: InventoryCategory) {
  return useQuery({
    queryKey: ['inventory', 'available', category],
    queryFn: async () =>
      (await api.get<InventoryItemDto[]>('/inventory/available', { params: { category } })).data,
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => (await api.get<InventoryItemDto[]>('/inventory')).data,
    refetchInterval: 30_000,
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      category: InventoryCategory;
      stockQty: number;
      unit: string;
      threshold: number;
    }) => (await api.post<InventoryItemDto>('/inventory', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      category: InventoryCategory;
      stockQty: number;
      unit: string;
      threshold: number;
    }) => {
      const { id, ...body } = input;
      return (await api.patch<InventoryItemDto>(`/inventory/${id}`, body)).data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/inventory/${id}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inventory'] });
      void qc.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useRestock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; qty: number }) =>
      (await api.post<InventoryItemDto>(`/inventory/${input.id}/restock`, { qty: input.qty })).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useCreateMedicineRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; quantity: string }) =>
      (await api.post<RequestDto>('/requests/medicine', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useCreateEquipmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; borrowDate: string }) =>
      (await api.post<RequestDto>('/requests/equipment', input)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useCreatePrintingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { serviceType: string; copies: number; file: File | null }) => {
      const form = new FormData();
      form.append('serviceType', input.serviceType);
      form.append('copies', String(input.copies));
      if (input.file) form.append('file', input.file);
      return (await api.post<RequestDto>('/requests/printing', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export type PrintingQueueRow = RequestDto & { fileUrl: string | null; fileName: string | null };

/** Opens the student's file in a new tab — docx is server-converted to PDF. */
export async function openPrintFile(requestId: string): Promise<void> {
  const { data } = await api.get<Blob>(`/requests/${requestId}/print-file`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function usePrintingQueue() {
  return useQuery({
    queryKey: ['requests', 'printing-queue'],
    queryFn: async () => (await api.get<PrintingQueueRow[]>('/requests/printing-queue')).data,
    refetchInterval: 30_000,
  });
}
