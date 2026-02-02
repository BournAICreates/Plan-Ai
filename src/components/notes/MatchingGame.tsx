import { useState, useEffect, useMemo } from 'react';
import type { Flashcard } from '../../store/useStudyStore';
import dashboardStyles from '../dashboard/Dashboard.module.css';
import { Check, RotateCcw, Timer, Trophy, XCircle, ArrowRight, Layers } from 'lucide-react';

interface MatchingGameProps {
    flashcards: Flashcard[];
    onExit: () => void;
}

interface GameCard {
    id: string; // Unique ID for the game grid (e.g. "card1-front")
    cardId: string; // ID of the parent flashcard (to check matches)
    content: string;
    type: 'front' | 'back';
    isMatched: boolean;
    isError?: boolean; // Temporary error state for animation
}

const PAIRS_PER_LEVEL = 6; // 12 cards total - should fit without scrolling

export function MatchingGame({ flashcards, onExit }: MatchingGameProps) {
    // Game State
    const [masterDeck, setMasterDeck] = useState<Flashcard[]>([]);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [selectedCards, setSelectedCards] = useState<GameCard[]>([]);

    // Status State
    const [isProcessing, setIsProcessing] = useState(false);
    const [levelComplete, setLevelComplete] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);

    // Stats
    const [startTime, setStartTime] = useState<number | null>(null);
    const [turns, setTurns] = useState(0);
    const [totalTurns, setTotalTurns] = useState(0);
    const [totalTimeMs, setTotalTimeMs] = useState(0);

    // Initialize Game (Shuffle Master Deck)
    useEffect(() => {
        initGame();
    }, [flashcards]);

    const initGame = () => {
        // Randomize the entire deck to form the sequence of levels
        const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
        setMasterDeck(shuffled);
        setCurrentLevel(0);
        setTotalTurns(0);
        setTotalTimeMs(0);
        setGameComplete(false);
        // Start first level
        startLevel(0, shuffled);
    };

    const startLevel = (levelIndex: number, deck: Flashcard[]) => {
        const startIndex = levelIndex * PAIRS_PER_LEVEL;
        const currentBatch = deck.slice(startIndex, startIndex + PAIRS_PER_LEVEL);

        if (currentBatch.length === 0) {
            setGameComplete(true);
            return;
        }

        const gameCards: GameCard[] = [];
        currentBatch.forEach(card => {
            gameCards.push({
                id: `${card.id}-front`,
                cardId: card.id,
                content: card.front,
                type: 'front',
                isMatched: false
            });
            gameCards.push({
                id: `${card.id}-back`,
                cardId: card.id,
                content: card.back,
                type: 'back',
                isMatched: false
            });
        });

        // Shuffle grid
        setCards(gameCards.sort(() => Math.random() - 0.5));

        // Reset Level State
        setStartTime(Date.now());
        setTurns(0);
        setSelectedCards([]);
        setIsProcessing(false);
        setLevelComplete(false);
    };

    const handleNextLevel = () => {
        // Accumulate stats
        if (startTime) {
            setTotalTimeMs(prev => prev + (Date.now() - startTime));
        }
        setTotalTurns(prev => prev + turns);

        const nextLevel = currentLevel + 1;

        // Check if we have cards for next level
        if (nextLevel * PAIRS_PER_LEVEL >= masterDeck.length) {
            setGameComplete(true);
        } else {
            setCurrentLevel(nextLevel);
            startLevel(nextLevel, masterDeck);
        }
    };

    const handleCardClick = (clickedCard: GameCard) => {
        // Ignore if processing, already matched, or selecting same card twice
        if (isProcessing || clickedCard.isMatched) return;

        // If clicking the already selected card, deselect it
        if (selectedCards.length === 1 && selectedCards[0].id === clickedCard.id) {
            setSelectedCards([]);
            return;
        }

        const newSelected = [...selectedCards, clickedCard];
        setSelectedCards(newSelected);

        if (newSelected.length === 2) {
            setTurns(t => t + 1);
            checkForMatch(newSelected[0], newSelected[1]);
        }
    };

    const checkForMatch = (card1: GameCard, card2: GameCard) => {
        setIsProcessing(true);
        const isMatch = card1.cardId === card2.cardId;

        if (isMatch) {
            // Success!
            setTimeout(() => {
                setCards(prev => {
                    const newCards = prev.map(c =>
                        c.cardId === card1.cardId ? { ...c, isMatched: true } : c
                    );

                    // Check Level Completion here
                    if (newCards.every(c => c.isMatched)) {
                        setLevelComplete(true);
                    }
                    return newCards;
                });
                setSelectedCards([]);
                setIsProcessing(false);
            }, 300);
        } else {
            // Failure - Show Error
            setCards(prev => prev.map(c =>
                (c.id === card1.id || c.id === card2.id) ? { ...c, isError: true } : c
            ));

            setTimeout(() => {
                setCards(prev => prev.map(c =>
                    (c.id === card1.id || c.id === card2.id) ? { ...c, isError: false } : c
                ));
                setSelectedCards([]);
                setIsProcessing(false);
            }, 800);
        }
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    // Calculate total levels
    const totalLevels = Math.ceil(masterDeck.length / PAIRS_PER_LEVEL);

    // --- RENDER ---

    if (gameComplete) {
        return (
            <div className={dashboardStyles.studyContainer} style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                    boxShadow: '0 10px 25px rgba(var(--color-primary-rgb), 0.4)'
                }}>
                    <Trophy size={40} color="white" />
                </div>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                    Champion!
                </h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    You completed all {totalLevels} levels.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Time</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatTime(totalTimeMs)}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Turns</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{totalTurns}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button onClick={onExit} className={dashboardStyles.studyActionBtn}>
                        Exit
                    </button>
                    <button
                        onClick={initGame}
                        className={dashboardStyles.studyActionBtn}
                        style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}
                    >
                        <RotateCcw size={18} /> Play Again
                    </button>
                </div>
            </div>
        );
    }

    if (levelComplete) {
        return (
            <div className={dashboardStyles.studyContainer} style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                    <Check size={32} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
                    Level {currentLevel + 1} Complete!
                </h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Nice work! Ready for the next set?
                </p>
                <button
                    onClick={handleNextLevel}
                    className={dashboardStyles.studyActionBtn}
                    style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)', width: 'auto', padding: '0.75rem 2rem' }}
                >
                    Next Level <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* HUD */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0 0.5rem'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: '600' }}>
                        <Layers size={16} />
                        Level {currentLevel + 1} / {totalLevels}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Timer size={16} />
                        {startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}s
                    </div>
                    <div>Turns: {turns}</div>
                </div>
                <button
                    onClick={initGame}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                >
                    <RotateCcw size={14} /> Restart All
                </button>
            </div>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                overflowY: 'auto',
                padding: '0.5rem',
                flex: 1
            }}>
                {cards.map(card => {
                    const isSelected = selectedCards.some(c => c.id === card.id);
                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            style={{
                                position: 'relative',
                                aspectRatio: '1/0.8', // Slightly more rectangular for text
                                cursor: card.isMatched ? 'default' : 'pointer',
                                background: card.isMatched
                                    ? 'var(--color-bg-secondary)'
                                    : isSelected
                                        ? 'rgba(59, 130, 246, 0.1)'
                                        : 'var(--color-bg-surface)',
                                border: card.isError
                                    ? '2px solid var(--color-error)'
                                    : card.isMatched
                                        ? '2px solid var(--color-success)'
                                        : isSelected
                                            ? '2px solid var(--color-primary)'
                                            : '1px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                opacity: card.isMatched ? 0.6 : 1,
                            }}
                        >
                            {/* Status Icon */}
                            {card.isMatched && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--color-success)' }}>
                                    <Check size={18} />
                                </div>
                            )}
                            {card.isError && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--color-error)' }}>
                                    <XCircle size={18} />
                                </div>
                            )}

                            {/* Type Label */}
                            <span style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: 'var(--color-text-muted)',
                                marginBottom: '0.5rem',
                                opacity: 0.7
                            }}>
                                {card.type === 'front' ? 'Term' : 'Definition'}
                            </span>

                            <div style={{
                                width: '100%',
                                overflow: 'hidden',
                                overflowY: 'auto',
                                maxHeight: '100%',
                                wordWrap: 'break-word',
                                fontSize: '0.9rem',
                                color: card.isMatched ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                                fontWeight: card.type === 'front' ? 600 : 400
                            }}>
                                {card.content}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
