import { create } from 'zustand';

export type PortalLanguage = 'en' | 'fil';

interface Toast {
  id: number;
  message: string;
}

interface UiState {
  toasts: Toast[];
  navCollapsed: boolean;
  notifOpen: boolean;
  mobileNavOpen: boolean;
  chatOpen: boolean;
  chatUnread: number;
  language: PortalLanguage;
  soundsMuted: boolean;
  toast: (message: string) => void;
  dismissToast: (id: number) => void;
  toggleNav: () => void;
  toggleNotif: () => void;
  closeNotif: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleChat: () => void;
  bumpChat: () => void;
  setLanguage: (language: PortalLanguage) => void;
  toggleSounds: () => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  navCollapsed: false,
  notifOpen: false,
  mobileNavOpen: false,
  chatOpen: false,
  chatUnread: 0,
  language: (localStorage.getItem('brgy-language') as PortalLanguage) ?? 'en',
  soundsMuted: localStorage.getItem('brgy-sounds-muted') === 'true',
  toast: (message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
  closeNotif: () => set({ notifOpen: false }),
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen, chatUnread: 0 })),
  bumpChat: () => set((s) => (s.chatOpen ? {} : { chatUnread: s.chatUnread + 1 })),
  setLanguage: (language) => {
    localStorage.setItem('brgy-language', language);
    set({ language });
  },
  toggleSounds: () =>
    set((s) => {
      localStorage.setItem('brgy-sounds-muted', String(!s.soundsMuted));
      return { soundsMuted: !s.soundsMuted };
    }),
}));
