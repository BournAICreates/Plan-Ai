import { create } from 'zustand';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, deleteField
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// folderId is optional for backwards compatibility
export interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: Date;
    category?: string;
    folderId?: string;
    testStats?: {
        totalScore: number;
        totalQuestions: number;
        testsTaken: number;
    };
}

export interface Folder {
    id: string;
    name: string;
    createdAt: Date;
}

interface NoteState {
    notes: Note[];
    folders: Folder[];
    activeNoteId: string | undefined;
    activeFolderId: string | undefined;
    isMobileMenuOpen: boolean;
    loading: boolean;
    unsubscribeNotes: (() => void) | null;
    unsubscribeFolders: (() => void) | null;

    subscribe: (uid: string) => void;
    setActiveNote: (id: string) => void;
    setActiveFolder: (id: string | undefined) => void;
    toggleMobileMenu: () => void;

    addNote: (uid: string, folderId?: string) => Promise<string>;
    updateNote: (uid: string, id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (uid: string, id: string) => Promise<void>;
    resetAllStats: (uid: string) => Promise<void>;

    addFolder: (uid: string, name: string) => Promise<string>;
    deleteFolder: (uid: string, id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
    notes: [],
    folders: [],
    activeNoteId: undefined,
    activeFolderId: undefined,
    isMobileMenuOpen: false,
    loading: false,
    unsubscribeNotes: null,
    unsubscribeFolders: null,

    subscribe: (uid: string) => {
        const { unsubscribeNotes, unsubscribeFolders } = get();
        if (unsubscribeNotes) unsubscribeNotes();
        if (unsubscribeFolders) unsubscribeFolders();

        set({ loading: true });

        // Subscribe to Notes
        const notesQuery = query(collection(db, `users/${uid}/notes`), orderBy('updatedAt', 'desc'));
        const unsubNotes = onSnapshot(notesQuery, (snapshot) => {
            const notes = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
                } as Note;
            });

            const currentActive = get().activeNoteId;
            const stillExists = notes.find(n => n.id === currentActive);

            set({
                notes,
                loading: false,
                activeNoteId: stillExists ? currentActive : undefined
            });
        });

        // Subscribe to Folders
        const foldersQuery = query(collection(db, `users/${uid}/folders`), orderBy('createdAt', 'asc'));
        const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
            const folders = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                } as Folder;
            });
            set({ folders });
        });

        set({ unsubscribeNotes: unsubNotes, unsubscribeFolders: unsubFolders });
    },

    setActiveNote: (id) => set({ activeNoteId: id, isMobileMenuOpen: false }),
    setActiveFolder: (id) => set({ activeFolderId: id }),
    toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

    addNote: async (uid, folderId) => {
        const newNote = {
            title: 'Untitled Note',
            content: '',
            updatedAt: Timestamp.now(),
            category: 'Personal',
            folderId: folderId || null
        };
        // @ts-ignore
        const docRef = await addDoc(collection(db, `users/${uid}/notes`), newNote);
        set({ activeNoteId: docRef.id });
        return docRef.id;
    },

    updateNote: async (uid, id, updates) => {
        const noteRef = doc(db, `users/${uid}/notes`, id);
        await updateDoc(noteRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    },

    deleteNote: async (uid, id) => {
        await deleteDoc(doc(db, `users/${uid}/notes`, id));
    },

    resetAllStats: async (uid: string) => {
        const { notes, updateNote } = get();
        await Promise.all(notes.map(note =>
            updateNote(uid, note.id, {
                testStats: {
                    totalScore: 0,
                    totalQuestions: 0,
                    testsTaken: 0
                }
            })
        ));
    },

    addFolder: async (uid, name) => {
        const newFolder = {
            name,
            createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, `users/${uid}/folders`), newFolder);
        return docRef.id;
    },

    deleteFolder: async (uid, id) => {
        await deleteDoc(doc(db, `users/${uid}/folders`, id));
        // Optional: Move notes in this folder to 'Uncategorized' or delete them?
        // For now, let's just keep them but they will have an invalid folderId.
        // Or we can update them.
        const { notes, updateNote } = get();
        const notesInFolder = notes.filter(n => n.folderId === id);
        await Promise.all(notesInFolder.map(n =>
            updateNote(uid, n.id, { folderId: deleteField() as any }) // Remove pointer completely
        ));
    }
}));
