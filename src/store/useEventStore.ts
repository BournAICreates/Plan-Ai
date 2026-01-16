import { create } from 'zustand';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    type: 'meeting' | 'work' | 'personal' | 'routine';
    description?: string;
}

interface EventState {
    events: CalendarEvent[];
    loading: boolean;
    unsubscribe: (() => void) | null;

    subscribe: (uid: string) => void;
    addEvent: (uid: string, event: Omit<CalendarEvent, 'id'>) => Promise<void>;
    updateEvent: (uid: string, id: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<void>;
    deleteEvent: (uid: string, id: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
    events: [],
    loading: false,
    unsubscribe: null,

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
    }
}));
