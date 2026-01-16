import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle, XCircle, ArrowRight, RotateCcw, Key, ClipboardPen } from 'lucide-react';
import styles from '../notes/Notes.module.css';
import dashboardStyles from '../dashboard/Dashboard.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { useStudyStore, type TestQuestion, type Test } from '../../store/useStudyStore';
import { generateContent } from '../../lib/gemini';
import { useSettingsStore } from '../../store/useSettingsStore';

interface TestModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteContent: string;
}

type TestView = 'intro' | 'generating' | 'taking' | 'results';

export function TestModal({ isOpen, onClose, noteId, noteContent }: TestModalProps) {
    const { user } = useAuth();
    const { geminiApiKeys } = useSettingsStore();
    const { saveTest, tests, subscribeToTests } = useStudyStore();

    const [view, setView] = useState<TestView>('intro');
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({}); // questionIndex -> optionIndex
    const [initialAnswers, setInitialAnswers] = useState<Record<number, number>>({}); // questionIndex -> first option selected
    const [firstAttempts, setFirstAttempts] = useState<Record<number, boolean>>({}); // Track if first attempt was correct
    const [score, setScore] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [questionCount, setQuestionCount] = useState<number | 'auto'>('auto');

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setView('intro');
            setQuestions([]);
            setCurrentIndex(0);
            setUserAnswers({});
            setInitialAnswers({});
            setFirstAttempts({});
            setScore(0);
            setError(null);
            setQuestionCount('auto');
        } else if (user && noteId) {
            subscribeToTests(user.uid, noteId);
        }
    }, [isOpen, user, noteId, subscribeToTests]); // Added dependencies

    if (!isOpen) return null;

    const hasKey = geminiApiKeys && geminiApiKeys.length > 0;

    const handleViewTest = (test: Test) => {
        setQuestions(test.questions);
        setScore(test.score || 0);

        // Reconstruct answers map
        const answers: Record<number, number> = {};
        test.questions.forEach((q: any, idx: number) => {
            if (q.userAnswer !== undefined) {
                answers[idx] = q.userAnswer;
            }
        });
        setInitialAnswers(answers);
        setUserAnswers(answers); // For display purposes in results
        setView('results');
    };

    const handleRetakeTest = (test: Test) => {
        // Shuffle options for retake freshness
        const storedQuestions = test.questions.map((q) => {
            // If we want to reshuffle options, we need the original correct string value or be careful with indices.
            // stored question has 'options' and 'correctIndex'.
            // If we want to reshuffle, we'd have to track which string is correct.
            // For simplicity, let's keep the order or do a simple shuffle mapping. 
            // Let's just keep them as is for "Retake exact test" or re-implement shuffle if needed.
            // Start simple: Keep same order.
            return {
                ...q,
                userAnswer: undefined
            };
        });

        setQuestions(storedQuestions);
        setCurrentIndex(0);
        setUserAnswers({});
        setInitialAnswers({});
        setFirstAttempts({});
        setScore(0);
        setView('taking');
    };

    const handleGenerateTest = async () => {
        if (!hasKey || !noteContent) {
            setError("API Key or Note Content missing.");
            return;
        }

        setView('generating');
        setError(null);
        setFirstAttempts({});
        setInitialAnswers({});
        try {
            const countInstruction = questionCount === 'auto'
                ? "Do NOT limit the number of questions. Create as many as necessary to absolutely exhaust the source material (e.g., 20, 30, 50+ questions)."
                : `Create exactly ${questionCount} questions.`;

            const prompt = `Create a comprehensive multiple-choice test based on the following text.
                Return a JSON array of objects. Each object must have:
                - "question": string
                - "options": array of 4 strings
                - "correctIndex": number (0-3)
                - "explanation": string (brief explanation of why the correct answer is right)
                
                CRITICAL INSTRUCTIONS:
                1. Cover every single topic, fact, and concept in the text that could possibly be on a test.
                2. ${countInstruction}
                3. Include questions on details, definitions, applications, and conceptual understanding.
                4. Do not include markdown formatting. Just raw JSON.
                
                Text: ${noteContent}`;

            const response = await generateContent(geminiApiKeys, prompt);

            // Handle potential markdown code blocks in response
            const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

            // Try/Catch for JSON parsing
            let generatedQuestions: TestQuestion[];
            try {
                generatedQuestions = JSON.parse(cleanResponse);
            } catch (e) {
                console.error("JSON Parse Error", e);
                const match = cleanResponse.match(/\[.*\]/s);
                if (match) {
                    generatedQuestions = JSON.parse(match[0]);
                } else {
                    throw new Error("Failed to parse AI response.");
                }
            }

            if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
                throw new Error("Invalid question format received.");
            }

            // Shuffle options for each question to avoid bias
            const shuffledQuestions = generatedQuestions.map(q => {
                const indices = [0, 1, 2, 3];
                // Fisher-Yates shuffle for indices
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }

                return {
                    ...q,
                    options: indices.map(i => q.options[i]),
                    correctIndex: indices.indexOf(q.correctIndex)
                };
            });

            setQuestions(shuffledQuestions);
            setView('taking');
        } catch (err: any) {
            console.error("Test Generation Failed:", err);
            setError("Failed to generate test. Please try again.");
            setView('intro');
        }
    };

    const handleAnswer = (optionIndex: number) => {
        const isCorrect = optionIndex === questions[currentIndex].correctIndex;

        // Record first attempt for scoring if not already recorded
        setFirstAttempts(prev => {
            if (prev[currentIndex] === undefined) {
                return { ...prev, [currentIndex]: isCorrect };
            }
            return prev;
        });

        // Record initial answer if not already recorded
        setInitialAnswers(prev => {
            if (prev[currentIndex] === undefined) {
                return { ...prev, [currentIndex]: optionIndex };
            }
            return prev;
        });

        setUserAnswers(prev => ({
            ...prev,
            [currentIndex]: optionIndex
        }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        // Calculate score based on first attempts
        const calculatedScore = Object.values(firstAttempts).filter(Boolean).length;
        setScore(calculatedScore);

        // Save test to user history
        if (user) {
            await saveTest(user.uid, noteId, questions.map((q, idx) => ({
                ...q,
                userAnswer: initialAnswers[idx] !== undefined ? initialAnswers[idx] : userAnswers[idx]
            })), calculatedScore);
        }

        setView('results');
    };

    const resetTest = () => {
        setView('intro');
        setQuestions([]);
        setCurrentIndex(0);
        setUserAnswers({});
        setInitialAnswers({});
        setFirstAttempts({});
        setScore(0);
        setError(null);
    };

    const handleRetakeMissed = () => {
        const missedQuestionIndices = questions
            .map((_, index) => index)
            .filter(index => firstAttempts[index] === false);

        if (missedQuestionIndices.length === 0) return;

        // Get missed questions and shuffle their options again for the retake
        const missedQuestions = questions
            .filter((_, index) => missedQuestionIndices.includes(index))
            .map(q => {
                // Suffle logic same as generation
                const indices = [0, 1, 2, 3];
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }

                return {
                    ...q,
                    options: indices.map(i => q.options[i]),
                    correctIndex: indices.indexOf(q.correctIndex)
                };
            });

        setQuestions(missedQuestions);
        setView('taking');
        setCurrentIndex(0);
        setUserAnswers({});
        setInitialAnswers({});
        setFirstAttempts({});
        setScore(0);
        setError(null);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal} style={{ maxWidth: '800px', width: '95%', height: '85vh', maxHeight: '800px', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {!hasKey ? <Key size={20} /> : <ClipboardPen size={20} className="text-primary" />}
                        {!hasKey ? "API Setup" : "Practice Test"}
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent} style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

                    {/* Error Message */}
                    {error && (
                        <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    {/* View: Intro / Setup */}
                    {view === 'intro' && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>

                            {!hasKey ? (
                                <div style={{ width: '100%', maxWidth: '400px' }}>
                                    <Key size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', margin: '0 auto', display: 'block' }} />
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                                        Gemini API Key Required
                                    </h2>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                        To generate AI tests from your notes, please set up your Gemini API Key.
                                    </p>
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                                        Please <strong>close this window</strong> and click the <strong>Gemini (Sparkles) button</strong> in the Notes toolbar to configure your keys.
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className={dashboardStyles.studyActionBtn}
                                        style={{
                                            marginTop: '1.5rem',
                                            padding: '0.75rem 2rem'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <ClipboardPen size={64} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                                        Ready to test your knowledge?
                                    </h2>
                                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.5' }}>
                                        AI will generate a multiple-choice test based on your note.
                                        There is no time limit, take your time!
                                    </p>

                                    <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Number of Questions:</label>

                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                                {(['auto', 5, 10, 25] as const).map((qOption) => (
                                                    <button
                                                        key={qOption}
                                                        onClick={() => setQuestionCount(qOption)}
                                                        style={{
                                                            padding: '0.4rem 1rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.9rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            background: questionCount === qOption ? 'var(--color-background)' : 'transparent',
                                                            color: questionCount === qOption ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                            boxShadow: questionCount === qOption ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                                            border: '1px solid transparent',
                                                            borderColor: questionCount === qOption ? 'var(--color-border)' : 'transparent',
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
                                                max="50"
                                                placeholder="Custom"
                                                value={typeof questionCount === 'number' && ![5, 10, 25].includes(questionCount) ? questionCount : ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val) && val > 0) setQuestionCount(val);
                                                    else if (e.target.value === '') setQuestionCount('auto');
                                                }}
                                                style={{
                                                    width: '80px',
                                                    padding: '0.4rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--color-border)',
                                                    background: 'var(--color-bg-secondary)',
                                                    color: 'var(--color-text-main)',
                                                    fontSize: '0.9rem',
                                                    textAlign: 'center'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerateTest}
                                        className={dashboardStyles.studyActionBtn}
                                        style={{ background: 'var(--color-primary)', color: 'white', padding: '0.75rem 2rem', fontSize: '1.1rem', marginBottom: '2rem' }}
                                    >
                                        <Sparkles size={20} />
                                        Generate New Test
                                    </button>

                                    {tests.length > 0 && (
                                        <div style={{ width: '100%', maxWidth: '600px', textAlign: 'left' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                                Previous Tests
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                {tests.map((test) => (
                                                    <div key={test.id} style={{
                                                        padding: '1rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--color-border)',
                                                        background: 'var(--color-bg-secondary)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div>
                                                            <div style={{ fontWeight: '500', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                                                                {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Unknown Date'}
                                                                <span style={{ margin: '0 8px', color: 'var(--color-text-muted)' }}>•</span>
                                                                {test.questions.length} Questions
                                                            </div>
                                                            <div style={{ fontSize: '0.9rem', color: (test.score || 0) / test.questions.length >= 0.8 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                                                Score: {test.score}/{test.questions.length} ({Math.round(((test.score || 0) / test.questions.length) * 100)}%)
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={() => handleViewTest(test)}
                                                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-main)', cursor: 'pointer', fontSize: '0.85rem' }}
                                                            >
                                                                Review
                                                            </button>
                                                            <button
                                                                onClick={() => handleRetakeTest(test)}
                                                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-primary)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                                                            >
                                                                Retake
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* View: Generating */}
                    {view === 'generating' && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)' }}>Creating your test...</h3>
                            <p style={{ color: 'var(--color-text-muted)' }}>Analyzing your note and crafting questions.</p>
                        </div>
                    )}

                    {/* View: Taking */}
                    {view === 'taking' && questions.length > 0 && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                <span>Question {currentIndex + 1} of {questions.length}</span>
                                <span>Progress: {Math.round(((currentIndex) / questions.length) * 100)}%</span>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: '600', marginBottom: '1.5rem', lineHeight: '1.4', color: 'var(--color-text-main)' }}>
                                    {questions[currentIndex].question}
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {questions[currentIndex].options.map((option, idx) => {
                                        const isSelected = userAnswers[currentIndex] === idx;
                                        const isCorrect = idx === questions[currentIndex].correctIndex;
                                        const showWrong = isSelected && !isCorrect;
                                        const showRight = isSelected && isCorrect;

                                        let borderColor = 'var(--color-border)';
                                        let backgroundColor = 'var(--color-bg-secondary)';
                                        let textColor = 'var(--color-text-main)';
                                        let boxShadow = 'none';

                                        if (showWrong) {
                                            borderColor = 'var(--color-danger)';
                                            backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                            textColor = 'var(--color-danger)';
                                            boxShadow = '0 0 10px rgba(239, 68, 68, 0.2)';
                                        } else if (showRight) {
                                            borderColor = 'var(--color-success)';
                                            backgroundColor = 'rgba(34, 197, 94, 0.1)';
                                            textColor = 'var(--color-success)';
                                            boxShadow = '0 0 10px rgba(34, 197, 94, 0.2)';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    textAlign: 'left',
                                                    border: `2px solid ${borderColor}`,
                                                    background: backgroundColor,
                                                    color: textColor,
                                                    boxShadow: boxShadow,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    fontSize: '1rem',
                                                    position: 'relative'
                                                }}
                                            >
                                                <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{String.fromCharCode(65 + idx)}.</span>
                                                {option}

                                                {showWrong && <XCircle size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />}
                                                {showRight && <CheckCircle size={20} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleNext}
                                    disabled={userAnswers[currentIndex] !== questions[currentIndex].correctIndex}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{
                                        background: userAnswers[currentIndex] === questions[currentIndex].correctIndex ? 'var(--color-primary)' : 'var(--color-border)',
                                        color: 'white',
                                        cursor: userAnswers[currentIndex] === questions[currentIndex].correctIndex ? 'pointer' : 'not-allowed',
                                        opacity: userAnswers[currentIndex] === questions[currentIndex].correctIndex ? 1 : 0.6
                                    }}
                                >
                                    {currentIndex === questions.length - 1 ? 'Submit Test' : 'Next Question'}
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* View: Results */}
                    {view === 'results' && (
                        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '2rem', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
                                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Test Completed!</h2>
                                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
                                    You scored <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{score}</span> out of <span style={{ fontWeight: 'bold' }}>{questions.length}</span>
                                </p>
                                <div style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'inline-block', height: '10px', width: '200px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(score / questions.length) * 100}%`,
                                            background: score === questions.length ? 'var(--color-success)' : 'var(--color-primary)'
                                        }} />
                                    </div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                                        {Math.round((score / questions.length) * 100)}% Accuracy
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Review Answers</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {questions.map((q, idx) => {
                                    const initialAnswer = initialAnswers[idx];
                                    const isCorrect = initialAnswer === q.correctIndex; // Based on first attempt

                                    return (
                                        <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '12px', background: isCorrect ? 'rgba(74, 222, 128, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                                                {isCorrect
                                                    ? <CheckCircle size={24} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                                    : <XCircle size={24} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                                                }
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-main)' }}>
                                                    {q.question}
                                                </h4>
                                                {!isCorrect && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', background: 'var(--color-error)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', height: 'fit-content' }}>
                                                        Incorrect
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginLeft: '34px' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Your Answer</span>
                                                    <div style={{
                                                        padding: '0.75rem',
                                                        borderRadius: '6px',
                                                        background: initialAnswer !== undefined ? (isCorrect ? 'var(--color-success-bg)' : 'var(--color-error-bg)') : 'var(--color-bg-secondary)',
                                                        color: initialAnswer !== undefined ? (isCorrect ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-text-muted)',
                                                        fontWeight: '500'
                                                    }}>
                                                        {initialAnswer !== undefined ? q.options[initialAnswer] : 'Skipped'}
                                                    </div>
                                                </div>
                                                {!isCorrect && (
                                                    <div>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Correct Answer</span>
                                                        <div style={{
                                                            padding: '0.75rem',
                                                            borderRadius: '6px',
                                                            background: 'var(--color-success-bg)',
                                                            color: 'var(--color-success)',
                                                            fontWeight: '500'
                                                        }}>
                                                            {q.options[q.correctIndex]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {q.explanation && (
                                                <div style={{ marginTop: '1rem', marginLeft: '34px', padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                                                    <strong>Explanation:</strong> {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem', marginBottom: '2rem' }}>
                                {score < questions.length && (
                                    <button
                                        onClick={handleRetakeMissed}
                                        className={dashboardStyles.studyActionBtn}
                                        style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '0.75rem 2rem' }}
                                    >
                                        <RotateCcw size={18} />
                                        Retake Missed ({questions.length - score})
                                    </button>
                                )}
                                <button
                                    onClick={resetTest}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{ background: 'var(--color-primary)', color: 'white', padding: '0.75rem 2rem' }}
                                >
                                    <Sparkles size={18} />
                                    New Test
                                </button>
                                <button
                                    onClick={() => setView('intro')}
                                    className={dashboardStyles.studyActionBtn}
                                    style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '0.75rem 2rem' }}
                                >
                                    Back to Menu
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
