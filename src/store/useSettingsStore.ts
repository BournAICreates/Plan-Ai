import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    geminiApiKeys: string[];
    youtubeApiKey: string | null;
    setGeminiApiKeys: (keys: string[]) => void;
    setYoutubeApiKey: (key: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            geminiApiKeys: [],
            youtubeApiKey: null,
            setGeminiApiKeys: (keys) => set({ geminiApiKeys: keys }),
            setYoutubeApiKey: (key) => set({ youtubeApiKey: key }),
        }),
        {
            name: 'planner-settings',
        }
    )
);
