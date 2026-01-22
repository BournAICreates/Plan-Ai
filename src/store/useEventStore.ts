import { create } from 'zustand';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

import type { CalendarEvent, CalendarSubscription } from '../types/events';

// Re-export for convenience and backward compatibility
export type { CalendarEvent, CalendarSubscription };

interface EventState {
    events: CalendarEvent[];
    loading: boolean;
    unsubscribe: (() => void) | null;

    // Subscription State
    subscriptions: CalendarSubscription[];
    importedEvents: CalendarEvent[];
    loadingImported: boolean;
    syncError: string | null;
    lastSync: Date | null;

    subscribe: (uid: string) => void;
    addEvent: (uid: string, event: Omit<CalendarEvent, 'id'>) => Promise<void>;
    updateEvent: (uid: string, id: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<void>;
    deleteEvent: (uid: string, id: string) => Promise<void>;

    // Subscription Actions
    addSubscription: (uid: string, url: string, name: string) => Promise<void>;
    removeSubscription: (uid: string, subId: string) => Promise<void>;
    fetchSubscriptions: (uid: string) => Promise<void>;
    refreshImportedEvents: () => Promise<void>;
    clearSyncError: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
    events: [],
    loading: false,
    unsubscribe: null,

    subscriptions: [],
    importedEvents: [],
    loadingImported: false,
    syncError: null,
    lastSync: null,

    subscribe: (uid: string) => {
        const { unsubscribe } = get();
        if (unsubscribe) unsubscribe();

        set({ loading: true });

        const q = query(collection(db, `users/${uid}/events`), orderBy('start', 'asc'));

        const unsub = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    start: data.start ? data.start.toDate() : new Date()
                } as CalendarEvent;
            });
            set({ events, loading: false });
        });

        set({ unsubscribe: unsub });
    },

    addEvent: async (uid, event) => {
        await addDoc(collection(db, `users/${uid}/events`), {
            ...event,
            start: Timestamp.fromDate(event.start)
        });
    },

    updateEvent: async (uid, id, event) => {
        const eventRef = doc(db, `users/${uid}/events`, id);
        const updateData: any = { ...event };
        if (event.start) {
            updateData.start = Timestamp.fromDate(event.start);
        }
        await updateDoc(eventRef, updateData);
    },

    deleteEvent: async (uid, id) => {
        await deleteDoc(doc(db, `users/${uid}/events`, id));
    },

    // Subscription implementations
    addSubscription: async (uid, url, name) => {
        const subData: CalendarSubscription = {
            id: '', // Will be set by firestore loop or we let firestore generate it
            url,
            name,
            color: '#34d399' // default color
        };

        await addDoc(collection(db, `users/${uid}/subscriptions`), {
            url,
            name,
            color: subData.color,
            createdAt: Timestamp.now()
        });

        // Refresh list
        get().fetchSubscriptions(uid);
    },

    removeSubscription: async (uid, subId) => {
        await deleteDoc(doc(db, `users/${uid}/subscriptions`, subId));
        const currentSubs = get().subscriptions.filter(s => s.id !== subId);
        set({ subscriptions: currentSubs });
        // Refresh events
        get().refreshImportedEvents();
    },

    fetchSubscriptions: async (uid) => {
        const q = query(collection(db, `users/${uid}/subscriptions`));
        // We use onSnapshot for real-time updates or just getDocs. 
        // For settings like this, onSnapshot is nice.
        onSnapshot(q, (snapshot) => {
            const subs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CalendarSubscription[];

            set({ subscriptions: subs });
            // Initial fetch of events
            if (subs.length > 0) {
                get().refreshImportedEvents();
            }
        });
    },

    refreshImportedEvents: async () => {
        const { subscriptions } = get();
        if (subscriptions.length === 0) {
            set({ importedEvents: [], loadingImported: false });
            return;
        }

        set({ loadingImported: true, syncError: null });

        try {
            const { fetchAndParseCalendar } = await import('../utils/icalParser');

            let allEvents: CalendarEvent[] = [];
            let errorCount = 0;

            // Run imports in parallel
            const importPromises = subscriptions.map(async sub => {
                try {
                    const events = await fetchAndParseCalendar(sub.url);
                    return events.map(e => ({
                        ...e,
                        subscriptionId: sub.id,
                        // Ensure we strictly own the ID to behave well in React lists
                        id: `ext-${sub.id}-${e.id}`
                    }));
                } catch (e) {
                    console.error(`Failed to load subscription ${sub.name}`, e);
                    errorCount++;
                    return [];
                }
            });

            const results = await Promise.all(importPromises);
            allEvents = results.flat();

            if (errorCount > 0 && errorCount === subscriptions.length) {
                set({ syncError: 'Failed to sync external calendars. Please check URLs.' });
            } else if (errorCount > 0) {
                set({ syncError: 'Some calendars failed to sync.' });
            }

            set({ importedEvents: allEvents, loadingImported: false, lastSync: new Date() });
        } catch (error) {
            console.error('Error refreshing imported events:', error);
            set({ loadingImported: false, syncError: 'Internal sync error' });
        }
    },

    clearSyncError: () => set({ syncError: null })
}));
