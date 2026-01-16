import { create } from 'zustand';
import {
    collection,
    onSnapshot,
    writeBatch,
    doc,
    updateDoc,
    increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    status: 'new' | 'learning' | 'review' | 'mastered';
    knowCount?: number;
}

export interface TestQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    userAnswer?: number;
}

export interface Test {
    id: string;
    questions: TestQuestion[];
    score?: number;
    createdAt: Date;
    completedAt?: Date;
}

interface StudyState {
    flashcards: Flashcard[];
    tests: Test[];
    loading: boolean;
    unsubscribe: (() => void) | null;
    unsubscribeTests: (() => void) | null;

    subscribeToFlashcards: (uid: string, noteId: string) => void;
    subscribeToTests: (uid: string, noteId: string) => void;
    saveFlashcards: (uid: string, noteId: string, cards: { front: string; back: string }[]) => Promise<void>;
    updateFlashcardStatus: (uid: string, noteId: string, cardId: string, status: Flashcard['status']) => Promise<void>;
    updateCramProgress: (uid: string, noteId: string, cardId: string, result: 'know' | 'dont_know', currentCount: number) => Promise<void>;

    // Tests Actions
    saveTest: (uid: string, noteId: string, questions: TestQuestion[], score: number) => Promise<void>;

    // New delete action
    deleteFlashcards: (uid: string, noteId: string) => Promise<void>;
}

export const useStudyStore = create<StudyState>((set, get) => ({
    flashcards: [],
    tests: [],
    loading: false,
    unsubscribe: null,
    unsubscribeTests: null,

    subscribeToFlashcards: (uid: string, noteId: string) => {
        const { unsubscribe } = get();
        if (unsubscribe) unsubscribe();

        set({ loading: true });

        // Subscribe to the flashcards subcollection
        const q = collection(db, `users/${uid}/notes/${noteId}/flashcards`);

        const unsub = onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Flashcard[];

            set({ flashcards: cards, loading: false });
        });

        set({ unsubscribe: unsub });
    },

    saveFlashcards: async (uid, noteId, cards) => {
        const batch = writeBatch(db);
        const collectionRef = collection(db, `users/${uid}/notes/${noteId}/flashcards`);

        cards.forEach(card => {
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                ...card,
                status: 'new',
                knowCount: 0,
                createdAt: new Date()
            });
        });

        await batch.commit();
    },

    deleteFlashcards: async (uid, noteId) => {
        const batch = writeBatch(db);
        const { flashcards } = get();

        flashcards.forEach(card => {
            const cardRef = doc(db, `users/${uid}/notes/${noteId}/flashcards/${card.id}`);
            batch.delete(cardRef);
        });

        await batch.commit();
        set({ flashcards: [] });
    },

    updateFlashcardStatus: async (uid, noteId, cardId, status) => {
        const cardRef = doc(db, `users/${uid}/notes/${noteId}/flashcards/${cardId}`);
        await writeBatch(db).set(cardRef, { status }, { merge: true }).commit();
    },

    updateCramProgress: async (uid, noteId, cardId, result, currentCount) => {
        const cardRef = doc(db, `users/${uid}/notes/${noteId}/flashcards/${cardId}`);
        let updates: Partial<Flashcard> = {};

        if (result === 'know') {
            const newCount = (currentCount || 0) + 1;
            updates = {
                knowCount: newCount,
                status: newCount >= 3 ? 'mastered' : 'learning'
            };
        } else {
            updates = {
                knowCount: 0,
                status: 'learning' // Reset to learning on fail
            };
        }

        await writeBatch(db).set(cardRef, updates, { merge: true }).commit();
    },

    subscribeToTests: (uid: string, noteId: string) => {
        const { unsubscribeTests } = get();
        if (unsubscribeTests) unsubscribeTests();

        const q = collection(db, `users/${uid}/notes/${noteId}/tests`);

        const unsub = onSnapshot(q, (snapshot) => {
            const loadedTests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                completedAt: doc.data().completedAt?.toDate()
            })) as Test[];

            // Sort by createdAt descending
            loadedTests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            set({ tests: loadedTests });
        });

        set({ unsubscribeTests: unsub });
    },

    saveTest: async (uid, noteId, questions, score) => {
        const collectionRef = collection(db, `users/${uid}/notes/${noteId}/tests`);
        const newDocRef = doc(collectionRef);

        await writeBatch(db).set(newDocRef, {
            questions,
            score,
            createdAt: new Date(),
            completedAt: new Date(),
        }).commit();

        // Update Note Stats
        const noteRef = doc(db, `users/${uid}/notes/${noteId}`);
        await updateDoc(noteRef, {
            'testStats.totalScore': increment(score),
            'testStats.totalQuestions': increment(questions.length),
            'testStats.testsTaken': increment(1)
        });
    }
}));

