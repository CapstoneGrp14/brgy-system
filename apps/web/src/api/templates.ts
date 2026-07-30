import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface TemplateItem {
  id: string;
  documentType: string;
  name: string;
  originalFilename: string;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface ReleaseModeRow {
  documentType: string;
  labelText: string;
  releaseMode: 'DIGITAL' | 'PICKUP';
  isCustom: boolean;
  isActive: boolean;
}

export interface DocTypeView {
  key: string;
  labelText: string;
  sla: string;
  isCustom: boolean;
  isActive: boolean;
  releaseMode: 'DIGITAL' | 'PICKUP';
}

export interface TemplatesResponse {
  placeholders: string[];
  releaseModes: ReleaseModeRow[];
  items: TemplateItem[];
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get<TemplatesResponse>('/templates')).data,
  });
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: async () => (await api.get<DocTypeView[]>('/templates/document-types')).data,
  });
}

export function useAddDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { labelText: string; slaClass: string; releaseMode: 'DIGITAL' | 'PICKUP' }) =>
      (await api.post<DocTypeView>('/templates/document-types', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['document-types'] });
    },
  });
}

export function useToggleDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => (await api.post(`/templates/document-types/${key}/toggle`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['document-types'] });
    },
  });
}

export function useUploadTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { documentType: string; name: string; file: File }) => {
      const form = new FormData();
      form.append('documentType', input.documentType);
      if (input.name) form.append('name', input.name);
      form.append('file', input.file);
      return (await api.post('/templates', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useActivateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/templates/${id}/activate`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/templates/${id}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useSetReleaseMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { documentType: string; releaseMode: 'DIGITAL' | 'PICKUP' }) =>
      (await api.post('/templates/settings', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export async function fetchDownloadUrl(requestId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/requests/${requestId}/download`);
  return data.url;
}

export async function fetchPrintUrl(requestId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/requests/${requestId}/print`);
  return data.url;
}
