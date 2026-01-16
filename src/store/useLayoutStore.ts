import { create } from 'zustand';
import type { Layout } from 'react-grid-layout';

interface DashboardLayout {
    lg: Layout;
    md: Layout;
    sm: Layout;
    xs: Layout;
    xxs: Layout;
    [key: string]: Layout | undefined;
}

interface LayoutState {
    layouts: DashboardLayout;
    isEditing: boolean;

    setEditing: (isEditing: boolean) => void;
    setLayouts: (layouts: DashboardLayout) => void;
    loadLayouts: (uid: string) => void;
    saveLayouts: (uid: string, layouts: DashboardLayout) => void;
    addWidget: (uid: string, widgetId: string) => void;
    removeWidget: (uid: string, widgetId: string) => void;
}

const defaultLayouts: DashboardLayout = {
    lg: ([
        { i: 'schedule', x: 0, y: 0, w: 4, h: 10 },
        { i: 'tasks', x: 4, y: 0, w: 4, h: 5 },
        { i: 'clock', x: 4, y: 5, w: 4, h: 5 },
        { i: 'weather', x: 8, y: 0, w: 4, h: 5 },
        { i: 'notes', x: 0, y: 10, w: 6, h: 6 },
        { i: 'quote', x: 6, y: 10, w: 6, h: 6 },
    ] as unknown) as Layout,
    md: ([
        { i: 'schedule', x: 0, y: 0, w: 6, h: 10 },
        { i: 'tasks', x: 6, y: 0, w: 6, h: 5 },
        { i: 'clock', x: 6, y: 5, w: 6, h: 5 },
        { i: 'weather', x: 0, y: 10, w: 6, h: 5 },
        { i: 'notes', x: 6, y: 10, w: 6, h: 6 },
        { i: 'quote', x: 0, y: 20, w: 12, h: 6 },
    ] as unknown) as Layout,
    sm: ([
        { i: 'schedule', x: 0, y: 0, w: 12, h: 10 },
        { i: 'tasks', x: 0, y: 10, w: 12, h: 5 },
        { i: 'clock', x: 0, y: 15, w: 12, h: 5 },
        { i: 'weather', x: 0, y: 20, w: 12, h: 5 },
        { i: 'notes', x: 0, y: 30, w: 12, h: 6 },
        { i: 'quote', x: 0, y: 36, w: 12, h: 6 },
    ] as unknown) as Layout,
    xs: ([
        { i: 'schedule', x: 0, y: 0, w: 1, h: 10 },
        { i: 'tasks', x: 0, y: 10, w: 1, h: 5 },
        { i: 'clock', x: 0, y: 15, w: 1, h: 5 },
        { i: 'weather', x: 0, y: 20, w: 1, h: 5 },
        { i: 'notes', x: 0, y: 30, w: 1, h: 6 },
        { i: 'quote', x: 0, y: 36, w: 1, h: 6 },
    ] as unknown) as Layout,
    xxs: ([
        { i: 'schedule', x: 0, y: 0, w: 1, h: 10 },
        { i: 'tasks', x: 0, y: 10, w: 1, h: 5 },
        { i: 'clock', x: 0, y: 15, w: 1, h: 5 },
        { i: 'weather', x: 0, y: 20, w: 1, h: 5 },
        { i: 'notes', x: 0, y: 30, w: 1, h: 6 },
        { i: 'quote', x: 0, y: 36, w: 1, h: 6 },
    ] as unknown) as Layout
};

const STORAGE_KEY_PREFIX = 'dashboard-layout-';

export const useLayoutStore = create<LayoutState>((set) => ({
    layouts: defaultLayouts,
    isEditing: false,

    setEditing: (isEditing) => set({ isEditing }),

    setLayouts: (layouts) => set({ layouts }),

    loadLayouts: (uid) => {
        try {
            const storageKey = `${STORAGE_KEY_PREFIX}${uid}`;
            const savedLayouts = localStorage.getItem(storageKey);

            if (savedLayouts) {
                const parsedLayouts = JSON.parse(savedLayouts);
                console.log('Loaded layouts from localStorage:', parsedLayouts);
                set({ layouts: parsedLayouts });
            } else {
                console.log('No saved layouts found, using defaults');
                set({ layouts: defaultLayouts });
            }
        } catch (error) {
            console.error('Error loading layouts from localStorage:', error);
            set({ layouts: defaultLayouts });
        }
    },

    saveLayouts: (uid: string, layouts: DashboardLayout) => {
        try {
            console.log('Saving layouts to localStorage for user:', uid);

            // Save all breakpoints
            const cleanedLayouts: DashboardLayout = {
                lg: layouts.lg,
                md: layouts.md,
                sm: layouts.sm,
                xs: layouts.xs,
                xxs: layouts.xxs
            };

            const storageKey = `${STORAGE_KEY_PREFIX}${uid}`;
            localStorage.setItem(storageKey, JSON.stringify(cleanedLayouts));

            set({ layouts: cleanedLayouts });
            console.log('Layouts saved successfully to localStorage');
        } catch (error) {
            console.error('Error saving layouts to localStorage:', error);
        }
    },

    addWidget: (uid: string, widgetId: string) => {
        set((state) => {
            const newLayouts = { ...state.layouts };
            // Define standard size for new widgets
            const uniqueId = `${widgetId}_${Date.now()}`;
            const newItem = { i: uniqueId, x: 0, y: Infinity, w: 4, h: 5 }; // y: Infinity puts it at bottom

            // Add to all responsive layouts
            ['lg', 'md', 'sm', 'xs', 'xxs'].forEach((key) => {
                if (!newLayouts[key]) newLayouts[key] = [];
                // Only add if not already present
                if (!newLayouts[key].find((w) => w.i === uniqueId)) {
                    // For smaller screens, force full width
                    if (key === 'xs' || key === 'xxs') {
                        newLayouts[key] = [...newLayouts[key] as any[], { ...newItem, w: 1 }];
                    } else if (key === 'sm') {
                        newLayouts[key] = [...newLayouts[key] as any[], { ...newItem, w: 6 }]; // Half width on tablet
                    } else {
                        newLayouts[key] = [...newLayouts[key] as any[], newItem];
                    }
                }
            });

            // Save immediately
            const storageKey = `${STORAGE_KEY_PREFIX}${uid}`;
            localStorage.setItem(storageKey, JSON.stringify(newLayouts));

            return { layouts: newLayouts };
        });
    },

    removeWidget: (uid: string, widgetId: string) => {
        set((state) => {
            const newLayouts = { ...state.layouts };
            // Remove from all responsive layouts
            ['lg', 'md', 'sm', 'xs', 'xxs'].forEach((key) => {
                if (newLayouts[key]) {
                    newLayouts[key] = newLayouts[key].filter((w) => w.i !== widgetId);
                }
            });

            // Save immediately
            const storageKey = `${STORAGE_KEY_PREFIX}${uid}`;
            localStorage.setItem(storageKey, JSON.stringify(newLayouts));

            return { layouts: newLayouts };
        });
    }
}));
