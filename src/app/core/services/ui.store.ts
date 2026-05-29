import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface UIState {
  isBrainChatOpen: boolean;
  theme: 'light' | 'dark' | 'gold';
  isCollapsed: boolean;
  brainLanguage: 'en' | 'ur';
  isGlobalMicActive: boolean;
  globalTranscript: string;
}

const initialState: UIState = {
  isBrainChatOpen: false,
  theme: 'gold',
  isCollapsed: false,
  brainLanguage: (localStorage.getItem('brain-language') as 'en' | 'ur') || 'en',
  isGlobalMicActive: false,
  globalTranscript: ''
};

export const UIStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    initializeTheme() {
      const savedTheme = localStorage.getItem('ai-content-theme') as 'light' | 'dark' | 'gold';
      const initialTheme = savedTheme || 'gold';
      document.documentElement.setAttribute('data-theme', initialTheme);
      patchState(store, { theme: initialTheme });
    },
    toggleTheme() {
      const currentTheme = store.theme();
      let nextTheme: 'light' | 'dark' | 'gold' = 'gold';
      if (currentTheme === 'gold') nextTheme = 'dark';
      else if (currentTheme === 'dark') nextTheme = 'light';
      else nextTheme = 'gold';

      localStorage.setItem('ai-content-theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      patchState(store, { theme: nextTheme });
    },
    toggleBrainChat() {
      patchState(store, (state) => ({ isBrainChatOpen: !state.isBrainChatOpen }));
    },
    setBrainChat(isOpen: boolean) {
      patchState(store, { isBrainChatOpen: isOpen });
    },
    toggleCollapsed() {
      patchState(store, (state) => ({ isCollapsed: !state.isCollapsed }));
    },
    setCollapsed(collapsed: boolean) {
      patchState(store, { isCollapsed: collapsed });
    },
    setBrainLanguage(lang: 'en' | 'ur') {
      localStorage.setItem('brain-language', lang);
      patchState(store, { brainLanguage: lang });
    },
    toggleGlobalMic() {
      patchState(store, (state) => ({ isGlobalMicActive: !state.isGlobalMicActive }));
    }
  }))
);
