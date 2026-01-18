import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, RotateCcw, GraduationCap, Loader2, Zap, Trash2, Hash } from 'lucide-react';
import styles from './Notes.module.css'; // Re-using notes styles for modal layout
import dashboardStyles from '../dashboard/Dashboard.module.css'; // Using dashboard styles for flashcard specific classes we added
import { useStudyStore } from '../../store/useStudyStore';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuth } from '../../contexts/AuthContext';
import { generateContent } from '../../lib/gemini';

interface StudyModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteContent: string;
}

export function StudyModal({ isOpen, onClose, noteId, noteContent }: StudyModalProps) {
    const { user } = useAuth();
    const { geminiApiKeys } = useSettingsStore();
    const { flashcards, subscribeToFlashcards, saveFlashcards, updateFlashcardStatus } = useStudyStore();
    const [statusUpdating, setStatusUpdating] = useState(false);

    // Local state
    const [filterMode, setFilterMode] = useState<'all' | 'study' | 'cram'>('all');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Cram Session Local State
    const [cramSession, setCramSession] = useState<{
        active: boolean;
        cards: (any & { cramKnowCount: number })[]; // Local copy of cards with temporary know count
        startTime: number | null;
        endTime: number | null;
    }>({ active: false, cards: [], startTime: null, endTime: null });

    const [cardCount, setCardCount] = useState<number | 'auto'>('auto');
    const [customInstructions, setCustomInstructions] = useState('');

    // Filter cards for standard modes
    const displayedCards = useMemo(() => {
        if (filterMode === 'cram') {
            return cramSession.cards;
        }
        return filterMode === 'all'
            ? flashcards
            : flashcards.filter(c => c.status !== 'mastered');
    }, [filterMode, flashcards, cramSession.cards]);

    useEffect(() => {
        // Reset index when filter changes, but NOT if we are just updating cram cards
        // Only reset if we switch MODES
        if (filterMode !== 'cram') {
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    }, [filterMode]);

    // Safety check for index out of bounds (crucial for Cram mode when cards are removed)
    useEffect(() => {
        if (displayedCards.length > 0 && currentIndex >= displayedCards.length) {
            setCurrentIndex(0);
        }
    }, [displayedCards.length, currentIndex]);

    useEffect(() => {
        if (isOpen && user && noteId) {
            subscribeToFlashcards(user.uid, noteId);
        }
    }, [isOpen, user, noteId, subscribeToFlashcards]);

    // Reset Cram session on close
    useEffect(() => {
        if (!isOpen) {
            setCramSession({ active: false, cards: [], startTime: null, endTime: null });
            setFilterMode('all');
            setCardCount('auto');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const startCramSession = () => {
        // Create local copy of ALL cards (or study queue? User implied separate feature, let's use all for max flexibility, or maybe just what was filtered? "Separated feature" suggests standalone. Let's use ALL flashcards for the cram session.)
        const sessionCards = flashcards.map(card => ({ ...card, cramKnowCount: 0 }));
        // Initial shuffle
        const shuffled = [...sessionCards].sort(() => Math.random() - 0.5);

        setCramSession({
            active: true,
            cards: shuffled,
            startTime: Date.now(),
            endTime: null
        });
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const exitCramSession = () => {
        setCramSession({ active: false, cards: [], startTime: null, endTime: null });
        setFilterMode('all'); // Go back to default
    };

    const handleGenerate = async () => {
        if (!noteContent) return;

        if (!geminiApiKeys || geminiApiKeys.length === 0) {
            alert("Before AI use please insert Api Keys");
            return;
        }

        setIsGenerating(true);
        try {
            const countInstruction = cardCount === 'auto'
                ? "Do NOT limit the number of flashcards. Create as many as necessary to fully cover the material (e.g., 20, 30, 50+ if needed)."
                : `Create exactly ${cardCount} flashcards.`;

            const prompt = `Create a comprehensive deck of flashcards based on the following text.
                Return a JSON array of objects, where each object has "front" and "back" properties.
                
                CRITICAL INSTRUCTIONS:
                1. Cover every key concept, definition, useful detail, and potential test question found in the text.
                2. ${countInstruction}
                3. Ensure the flashcards are suitable for deep learning, not just surface-level review.
                4. ${customInstructions ? `USER CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
                5. Do not include markdown formatting. Just raw JSON.
                
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
            console.error("Failed to generate flashcards:", error);
            alert("Failed to generate flashcards. Please check your API key and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            if (filterMode === 'cram') {
                // Random next card from remaining
                if (displayedCards.length > 1) {
                    let nextIndex = Math.floor(Math.random() * displayedCards.length);
                    setCurrentIndex(nextIndex);
                } else {
                    setCurrentIndex(0);
                }
            } else {
                setCurrentIndex((prev) => (prev + 1) % displayedCards.length);
            }
        }, 150);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + displayedCards.length) % displayedCards.length);
        }, 150);
    };

    const handleRate = async (status: 'learning' | 'review' | 'mastered') => {
        if (!user || !noteId) return;

        setStatusUpdating(true);
        try {
            if (filterMode === 'cram') {
                // Local Cram Logic
                const currentCard = displayedCards[currentIndex];
                const isKnow = status === 'mastered';

                let newCards = [...cramSession.cards];
                // Find index in the session array (matches currentCard.id)
                const cardIndex = newCards.findIndex(c => c.id === currentCard.id);

                if (cardIndex !== -1) {
                    if (isKnow) {
                        newCards[cardIndex].cramKnowCount += 1;
                        // Mastery Check
                        if (newCards[cardIndex].cramKnowCount >= 3) {
                            // Remove card
                            newCards.splice(cardIndex, 1);
                        }
                    } else {
                        // Reset count
                        newCards[cardIndex].cramKnowCount = 0;
                    }
                }

                if (newCards.length === 0) {
                    // Session Complete
                    setCramSession(prev => ({ ...prev, cards: [], endTime: Date.now() }));
                } else {
                    setCramSession(prev => ({ ...prev, cards: newCards }));
                    handleNext(); // Shuffle to next
                }

            } else {
                // Normal Study Logic (Persisted)
                const currentCard = displayedCards[currentIndex];
                await updateFlashcardStatus(user.uid, noteId, currentCard.id, status);
                handleNext();
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        } finally {
            setStatusUpdating(false);
        }
    };



    // Format duration helper
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal} style={{ maxWidth: '1000px', width: '95%', height: '85vh', maxHeight: '900px' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <GraduationCap size={24} style={{ color: 'var(--color-primary)' }} />
                        <span>Study Mode</span>
                    </div>
                    {/* Hide filters if in active cram session to prevent accidental exit, or handle gracefully */}
                    {!cramSession.active && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', marginLeft: 'auto', marginRight: '1rem' }}>
                            <button
                                onClick={() => setFilterMode('all')}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: filterMode === 'all' ? 'var(--color-bg-main)' : 'transparent',
                                    color: filterMode === 'all' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                    boxShadow: filterMode === 'all' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: filterMode === 'all' ? 500 : 400
                                }}
                            >
                                All ({flashcards.length})
                            </button>
                            <button
                                onClick={() => setFilterMode('study')}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: filterMode === 'study' ? 'var(--color-bg-main)' : 'transparent',
                                    color: filterMode === 'study' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    boxShadow: filterMode === 'study' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: filterMode === 'study' ? 500 : 400
                                }}
                            >
                                Study Queue ({flashcards.filter(c => c.status !== 'mastered').length})
                            </button>
                            <button
                                onClick={() => setFilterMode('cram')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: filterMode === 'cram' ? 'var(--color-bg-main)' : 'transparent',
                                    color: filterMode === 'cram' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                    boxShadow: filterMode === 'cram' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: filterMode === 'cram' ? 500 : 400
                                }}
                            >
                                <Zap size={14} fill={filterMode === 'cram' ? 'currentColor' : 'none'} />
                                Cram
                            </button>
                        </div>
                    )}

                    {flashcards.length > 0 && !cramSession.active && (
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className={styles.closeBtn}
                            style={{ marginRight: '8px', color: 'var(--color-error)' }}
                            title="Delete Flashcard Set"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}

                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                    {/* View: Generating */}
                    {isGenerating && (
                        <div className={dashboardStyles.studyContainer}>
                            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--color-text-muted)' }}>Generating flashcards from your notes...</p>
                        </div>
                    )}

                    {/* View: Cram Intro */}
                    {!isGenerating && filterMode === 'cram' && !cramSession.active && !cramSession.endTime && (
                        <div className={dashboardStyles.studyContainer}>
                            <Zap size={48} style={{ color: 'var(--color-warning)', marginBottom: '1.5rem' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                                Ready to Cram?
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                                Cram mode helps you master cards quickly.
                                Rules:
                                <br />• Get a card right 3 times in a row to master it.
                                <br />• Getting it wrong resets progress.
                                <br />• Session ends when all cards are mastered!
                            </p>
                            <button
                                onClick={startCramSession}
                                className={dashboardStyles.studyActionBtn}
                                style={{ background: 'var(--color-warning)', color: 'white', borderColor: 'var(--color-warning)' }}
                            >
                                <Zap size={18} fill="white" />
                                Start Cram Session ({flashcards.length} Cards)
                            </button>
                        </div>
                    )}

                    {/* View: Cram Finished */}
                    {!isGenerating && filterMode === 'cram' && cramSession.endTime && (
                        <div className={dashboardStyles.studyContainer}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-success)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
                                boxShadow: '0 10px 25px rgba(82, 196, 26, 0.4)'
                            }}>
                                <Zap size={40} fill="white" color="white" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                                Session Complete!
                            </h3>
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                                You mastered all cards in <strong>{cramSession.startTime ? formatTime(cramSession.endTime - cramSession.startTime) : '0s'}</strong>.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={exitCramSession}
                                    className={dashboardStyles.studyActionBtn}
                                >
                                    Done
                                </button>
                                <button
                                    onClick={startCramSession}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}
                                >
                                    Cram Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* View: No Cards (Empty State - Normal Modes) */}
                    {!isGenerating && filterMode !== 'cram' && displayedCards.length === 0 && (
                        <div className={dashboardStyles.studyContainer}>
                            <Sparkles size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                                {filterMode === 'all' ? "Ready to study?" : "All caught up!"}
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                                {filterMode === 'all'
                                    ? "Use AI to instantly turn your note into a deck of flashcards."
                                    : "You've mastered all these cards! Switch to 'All' to review everything."}
                            </p>
                            <div className={dashboardStyles.studyFormGroup}>
                                <label className={dashboardStyles.studyLabel}>
                                    <Hash size={16} /> Number of Flashcards
                                </label>

                                <div className={dashboardStyles.studyOptionsRow}>
                                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--color-bg-subtle)', padding: '4px', borderRadius: '14px', flex: 1, border: '1px solid transparent' }}>
                                        {(['auto', 5, 10, 25] as const).map((qOption) => (
                                            <button
                                                key={qOption}
                                                onClick={() => setCardCount(qOption)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem 0.2rem',
                                                    borderRadius: '10px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    background: cardCount === qOption ? 'var(--color-bg-surface)' : 'transparent',
                                                    color: cardCount === qOption ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    boxShadow: cardCount === qOption ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    border: '1px solid',
                                                    borderColor: cardCount === qOption ? 'var(--color-border)' : 'transparent',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {qOption === 'auto' ? 'Auto' : qOption}
                                            </button>
                                        ))}
                                    </div>

                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="#"
                                        className={`${dashboardStyles.studyInputBase} ${dashboardStyles.studyNumberInput}`}
                                        value={typeof cardCount === 'number' && ![5, 10, 25].includes(cardCount) ? cardCount : ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val > 0) setCardCount(val);
                                            else if (e.target.value === '') setCardCount('auto');
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={dashboardStyles.studyFormGroup}>
                                <label className={dashboardStyles.studyLabel}>
                                    <Sparkles size={16} /> Custom Instructions (Optional)
                                </label>
                                <textarea
                                    className={`${dashboardStyles.studyInputBase} ${dashboardStyles.studyTextarea}`}
                                    placeholder="e.g. Focus on vocabulary, include specific dates, or make questions harder..."
                                    value={customInstructions}
                                    onChange={(e) => setCustomInstructions(e.target.value)}
                                />
                            </div>
                            {/* Only show generate if we have absolutely no cards, not just filtered ones */}
                            {flashcards.length === 0 && (
                                <button
                                    onClick={handleGenerate}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}
                                >
                                    <Sparkles size={18} />
                                    Generate Flashcards
                                </button>
                            )}

                            {flashcards.length > 0 && (
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{
                                        marginTop: '1rem',
                                        background: 'transparent',
                                        color: 'var(--color-error)',
                                        borderColor: 'var(--color-error)',
                                        opacity: 0.8
                                    }}
                                >
                                    Delete Set
                                </button>
                            )}
                        </div>
                    )}

                    {/* View: Review/Cram Active Mode */}
                    {!isGenerating && displayedCards.length > 0 && !(filterMode === 'cram' && !cramSession.active) && (
                        <div className={dashboardStyles.studyContainer}>
                            <div className={styles.modalSubtitle} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>
                                    {filterMode === 'cram'
                                        ? `Remaining: ${displayedCards.length}`
                                        : `Card ${currentIndex + 1} of ${displayedCards.length}`}
                                </span>
                                {filterMode !== 'cram' && displayedCards[currentIndex].status === 'mastered' && (
                                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--item-bg-hover)', color: 'var(--color-success) || green' }}>Learned</span>
                                )}
                                {filterMode !== 'cram' && displayedCards[currentIndex].status === 'review' && (
                                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--item-bg-hover)', color: 'var(--color-warning) || orange' }}>Review</span>
                                )}
                                {filterMode === 'cram' && displayedCards[currentIndex] && (
                                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--item-bg-hover)', color: 'var(--color-primary)' }}>
                                        Streak: {displayedCards[currentIndex].cramKnowCount || 0}/3
                                    </span>
                                )}
                            </div>

                            <div
                                key={currentIndex}
                                className={`${dashboardStyles.flashcard} ${dashboardStyles.flashcardEntry} ${isFlipped ? dashboardStyles.flipped : ''}`}
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <div className={dashboardStyles.flashcardFace}>
                                    {displayedCards[currentIndex]?.front}
                                </div>
                                <div className={`${dashboardStyles.flashcardFace} ${dashboardStyles.flashcardBack}`}>
                                    {displayedCards[currentIndex]?.back}
                                </div>
                            </div>

                            <div className={dashboardStyles.studyControls}>
                                <button className={dashboardStyles.studyActionBtn} onClick={handlePrev}>
                                    <ChevronLeft size={20} />
                                    Prev
                                </button>
                                <button
                                    className={dashboardStyles.studyActionBtn}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    style={{ minWidth: '100px', justifyContent: 'center' }}
                                >
                                    <RotateCcw size={18} />
                                    Flip
                                </button>
                                <button className={dashboardStyles.studyActionBtn} onClick={handleNext}>
                                    Next
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center', width: '100%', maxWidth: '500px' }}>
                                <button
                                    className={dashboardStyles.studyActionBtn}
                                    onClick={(e) => { e.stopPropagation(); handleRate('learning'); }}
                                    disabled={statusUpdating}
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        background: 'transparent',
                                        border: '1px solid var(--color-error, #ff4d4f)',
                                        color: 'var(--color-error, #ff4d4f)',
                                        transition: 'all 0.2s ease',
                                        padding: '0.75rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <X size={18} />
                                    Don't Know
                                </button>



                                <button
                                    className={dashboardStyles.studyActionBtn}
                                    onClick={(e) => { e.stopPropagation(); handleRate('mastered'); }}
                                    disabled={statusUpdating}
                                    style={{
                                        flex: 1.5,
                                        justifyContent: 'center',
                                        background: 'var(--color-success, #52c41a)',
                                        border: '1px solid var(--color-success, #52c41a)',
                                        color: 'white',
                                        fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                                        transition: 'all 0.2s ease',
                                        padding: '0.75rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(82, 196, 26, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.3)';
                                    }}
                                >
                                    <Sparkles size={18} fill="white" />
                                    Know
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={async () => {
                    if (user) await useStudyStore.getState().deleteFlashcards(user.uid, noteId);
                }}
                title="Delete Flashcards"
                message="Are you sure you want to delete all flashcards for this note? This action cannot be undone."
                confirmText="Delete"
                isDangerous={true}
            />
        </div>
    );
}
