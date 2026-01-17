import { create } from 'zustand';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    dueDate?: Date;
    priority: 'light' | 'medium' | 'urgent';
    order?: number;
    category?: 'school' | 'work' | 'personal';
    completedAt?: Date;
}

interface TaskState {
    tasks: Task[];
    loading: boolean;
    unsubscribe: (() => void) | null;
    subscribe: (uid: string) => void;
    addTask: (uid: string, task: Omit<Task, 'id'>) => Promise<void>;
    toggleStatus: (uid: string, id: string, status: Task['status']) => Promise<void>;
    deleteTask: (uid: string, id: string) => Promise<void>;
    updateTaskOrder: (uid: string, id: string, newOrder: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    loading: false,
    unsubscribe: null,

    subscribe: (uid: string) => {
        const { unsubscribe } = get();
        if (unsubscribe) unsubscribe();

        set({ loading: true });
        console.log('[useTaskStore] Subscribing to tasks for:', uid);

        // Sort by order descending (newest/highest on top)
        const q = query(collection(db, `users/${uid}/tasks`), orderBy('order', 'desc'));

        const unsub = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
                    completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
                    // Backfill order if missing for seamless migration
                    order: data.order ?? (data.createdAt?.toMillis() || Date.now())
                } as Task;
            });
            set({ tasks, loading: false });
        }, (error) => {
            console.error('[useTaskStore] Snapshot error:', error);
        });

        set({ unsubscribe: unsub });
    },

    addTask: async (uid, task) => {
        const now = Timestamp.now();
        await addDoc(collection(db, `users/${uid}/tasks`), {
            ...task,
            createdAt: now,
            order: now.toMillis() // Default order = timestamp
        });
    },

    toggleStatus: async (uid, id, status) => {
        const taskRef = doc(db, `users/${uid}/tasks`, id);
        const updates: any = { status };
        if (status === 'done') {
            updates.completedAt = Timestamp.now();
        } else {
            updates.completedAt = null;
        }
        await updateDoc(taskRef, updates);
    },

    deleteTask: async (uid, id) => {
        await deleteDoc(doc(db, `users/${uid}/tasks`, id));
    },

    updateTaskOrder: async (uid, id, newOrder) => {
        const taskRef = doc(db, `users/${uid}/tasks`, id);
        await updateDoc(taskRef, { order: newOrder });
    }
}));
