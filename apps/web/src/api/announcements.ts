import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  channelBanner: boolean;
  channelEmail: boolean;
  photoUrl: string | null;
  authorLabel: string;
  createdAt: string;
}

export interface AnnouncementFeed {
  items: AnnouncementView[];
  years: number[];
}

export function useAnnouncements(year?: number) {
  return useQuery({
    queryKey: ['announcements', year ?? 'all'],
    queryFn: async () =>
      (await api.get<AnnouncementFeed>('/announcements', { params: year ? { year } : {} })).data,
    refetchInterval: 60_000, // socket 'announcement:new' invalidates sooner
  });
}

export function usePostAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      banner: boolean;
      email: boolean;
      urgent: boolean;
      photo: File | null;
    }) => {
      const form = new FormData();
      form.append('title', input.title);
      form.append('body', input.body);
      form.append('banner', String(input.banner));
      form.append('email', String(input.email));
      form.append('urgent', String(input.urgent));
      if (input.photo) form.append('photo', input.photo);
      return (await api.post<AnnouncementView>('/announcements', form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      body: string;
      banner: boolean;
      email: boolean;
      urgent: boolean;
      photo: File | null;
      removePhoto?: boolean;
    }) => {
      const form = new FormData();
      form.append('title', input.title);
      form.append('body', input.body);
      form.append('banner', String(input.banner));
      form.append('email', String(input.email));
      form.append('urgent', String(input.urgent));
      if (input.removePhoto) form.append('removePhoto', 'true');
      if (input.photo) form.append('photo', input.photo);
      return (await api.patch<AnnouncementView>(`/announcements/${input.id}`, form)).data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`);
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}
