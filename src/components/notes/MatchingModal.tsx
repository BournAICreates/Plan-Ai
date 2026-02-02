import { useState, useEffect } from 'react';
import { X, Puzzle, Loader2, Sparkles } from 'lucide-react';
import styles from './Notes.module.css';
import dashboardStyles from '../dashboard/Dashboard.module.css';
import { useStudyStore } from '../../store/useStudyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuth } from '../../contexts/AuthContext';
import { generateContent } from '../../lib/gemini';
import { MatchingGame } from './MatchingGame';

interface MatchingModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteContent: string;
}

export function MatchingModal({ isOpen, onClose, noteId, noteContent }: MatchingModalProps) {
    const { user } = useAuth();
    const { geminiApiKeys } = useSettingsStore();
    const { flashcards, subscribeToFlashcards, saveFlashcards } = useStudyStore();

    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen && user && noteId) {
            subscribeToFlashcards(user.uid, noteId);
        }
    }, [isOpen, user, noteId, subscribeToFlashcards]);

    const handleGenerate = async () => {
        if (!noteContent) return;
        if (!geminiApiKeys || geminiApiKeys.length === 0) {
            alert("Please configure your API keys first.");
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `Create a matching game dataset from the following text.
                Return a JSON array of objects, where each object has "front" (term/question) and "back" (definition/answer) properties.
                Create at least 15 pairs if possible.
                
                CRITICAL INSTRUCTIONS:
                1. Focus on key terms and their definitions.
                2. Do not include markdown formatting. Just raw JSON.
                
                Text: ${noteContent}`;

            const response = await generateContent(geminiApiKeys, prompt);

            // Allow for markdown code block stripping just in case
            const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const cards = JSON.parse(cleanResponse);

            if (Array.isArray(cards)) {
                if (user) {
                    await saveFlashcards(user.uid, noteId, cards);
                }
            }
        } catch (error) {
            console.error("Failed to generate matching pairs:", error);
            alert("Failed to generate game data.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal} style={{ maxWidth: '1000px', width: '95%', height: '85vh', maxHeight: '900px' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <Puzzle size={24} style={{ color: 'var(--color-primary)' }} />
                        <span>Matching Game</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                    {/* View: Generating */}
                    {isGenerating && (
                        <div className={dashboardStyles.studyContainer}>
                            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--color-text-muted)' }}>Creating game data...</p>
                        </div>
                    )}

                    {/* View: No Data */}
                    {!isGenerating && flashcards.length === 0 && (
                        <div className={dashboardStyles.studyContainer}>
                            <Puzzle size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                                Ready to Play?
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                                Use AI to generate matching pairs from your note content.
                            </p>
                            <button
                                onClick={handleGenerate}
                                className={dashboardStyles.studyActionBtn}
                                style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}
                            >
                                <Sparkles size={18} />
                                Generate Game
                            </button>
                        </div>
                    )}

                    {/* View: Game */}
                    {!isGenerating && flashcards.length > 0 && (
                        <MatchingGame
                            flashcards={flashcards}
                            onExit={onClose}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
