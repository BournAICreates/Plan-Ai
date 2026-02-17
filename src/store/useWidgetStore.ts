import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetLayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    visible?: boolean;
}

interface WidgetState {
    layouts: { lg: WidgetLayoutItem[] };
    isVisible: { [key: string]: boolean };
    resetLayout: () => void;
    updateLayout: (layout: WidgetLayoutItem[]) => void;
    toggleVisibility: (id: string, visible?: boolean) => void;
    addWidget: (id: string) => void;
}

const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
    { i: 'clock', x: 0, y: 0, w: 3, h: 2 },
    { i: 'weather', x: 3, y: 0, w: 3, h: 4 },
    { i: 'quote', x: 0, y: 2, w: 3, h: 2 },
    { i: 'tasks', x: 6, y: 0, w: 6, h: 8 },
];

const DEFAULT_VISIBILITY = {
    'clock': true,
    'weather': true,
    'tasks': true,
    'quote': true,
};

export const useWidgetStore = create<WidgetState>()(
    persist(
        (set) => ({
            layouts: { lg: DEFAULT_LAYOUT },
            isVisible: DEFAULT_VISIBILITY,
            resetLayout: () => set({
                layouts: { lg: DEFAULT_LAYOUT },
                isVisible: DEFAULT_VISIBILITY
            }),
            updateLayout: (newLayout) => set({
                layouts: { lg: newLayout }
            }),
            toggleVisibility: (id, visible) => set((state) => ({
                isVisible: {
                    ...state.isVisible,
                    [id]: visible !== undefined ? visible : !state.isVisible[id]
                }
            })),
            addWidget: (id) => set((state) => ({ isVisible: { ...state.isVisible, [id]: true } }))
        }),
        {
            name: 'widget-layout-storage',
        }
    )
);
