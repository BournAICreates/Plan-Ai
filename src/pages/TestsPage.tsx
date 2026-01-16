import { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { ClipboardPen, ArrowRight, Trophy, Target, TrendingUp, RotateCcw } from 'lucide-react';
import styles from '../components/dashboard/Dashboard.module.css';
import { TestModal } from '../components/notes/TestModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

import { useAuth } from '../contexts/AuthContext';

export function TestsPage() {
    const { user } = useAuth();
    const { notes, resetAllStats } = useNoteStore();
    const [selectedNote, setSelectedNote] = useState<{ id: string, content: string } | null>(null);

    const sortedNotes = [...notes].sort((a, b) =>
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
    );

    // Calculate Analytics
    const totalTestsTaken = notes.reduce((acc, note) => acc + (note.testStats?.testsTaken || 0), 0);
    const totalQuestions = notes.reduce((acc, note) => acc + (note.testStats?.totalQuestions || 0), 0);
    const totalScore = notes.reduce((acc, note) => acc + (note.testStats?.totalScore || 0), 0);
    const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    const [showResetConfirm, setShowResetConfirm] = useState(false);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className={styles.dashboardHeader} style={{ marginBottom: '2rem' }}>
                <div className={styles.greetingSection}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ClipboardPen size={32} style={{ color: 'var(--color-primary)' }} />
                        Study Center
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Generate tests, track progress, and chat with your notes.</p>
                </div>
                <button
                    onClick={() => setShowResetConfirm(true)}
                    style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.9rem'
                    }}
                >
                    <RotateCcw size={16} />
                    Reset Stats
                </button>
            </div>

            {/* Analytics Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                <div className={styles.card} style={{ flexDirection: 'row', alignItems: 'center', padding: '1.5rem', minHeight: 'auto' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginRight: '1rem' }}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Tests Taken</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{totalTestsTaken}</div>
                    </div>
                </div>
                <div className={styles.card} style={{ flexDirection: 'row', alignItems: 'center', padding: '1.5rem', minHeight: 'auto' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginRight: '1rem' }}>
                        <Target size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Average Accuracy</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{averageScore}%</div>
                    </div>
                </div>
                <div className={styles.card} style={{ flexDirection: 'row', alignItems: 'center', padding: '1.5rem', minHeight: 'auto' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginRight: '1rem' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Questions Answered</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{totalQuestions}</div>
                    </div>
                </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Your Notes</h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginTop: '1rem'
            }}>
                {sortedNotes.map(note => {
                    const noteScore = note.testStats?.totalQuestions
                        ? Math.round((note.testStats.totalScore / note.testStats.totalQuestions) * 100)
                        : 0;

                    return (
                        <div
                            key={note.id}
                            className={styles.card}
                            style={{ cursor: 'pointer', height: 'auto', minHeight: '200px', justifyContent: 'space-between' }}
                            onClick={() => setSelectedNote({ id: note.id, content: note.content })}
                        >
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h3 className={styles.cardTitle} style={{ borderBottom: 'none', marginBottom: '0', flex: 1 }}>
                                        {note.title || 'Untitled Note'}
                                    </h3>
                                    {note.testStats && note.testStats.testsTaken > 0 && (
                                        <div style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: noteScore >= 80 ? 'rgba(16, 185, 129, 0.1)' : noteScore >= 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: noteScore >= 80 ? '#10b981' : noteScore >= 60 ? '#f59e0b' : '#ef4444',
                                            fontSize: '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            {noteScore}% Mastery
                                        </div>
                                    )}
                                </div>

                                <p style={{
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.875rem',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '1rem'
                                }}>
                                    {note.content.replace(/<[^>]*>/g, '') || 'No content...'}
                                </p>

                                {/* Mastery Bar */}
                                {note.testStats && note.testStats.testsTaken > 0 && (
                                    <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                        <div style={{ width: `${noteScore}%`, height: '100%', background: noteScore >= 80 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid var(--color-border)',
                                width: '100%'
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {note.updatedAt?.toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className={styles.iconButton} style={{ borderRadius: 'var(--radius-full)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {sortedNotes.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
                        <p>No notes found. Create a note first to generate tests.</p>
                    </div>
                )}
            </div>

            <TestModal
                isOpen={!!selectedNote}
                onClose={() => setSelectedNote(null)}
                noteId={selectedNote?.id || ''}
                noteContent={selectedNote?.content || ''}
            />

            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => resetAllStats(user?.uid || '')}
                title="Reset All Stats"
                message="Are you sure you want to reset ALL your test statistics? This will clear your total tests taken, average accuracy, and questions answered count. This action cannot be undone."
                confirmText="Reset Everything"
                isDangerous={true}
            />
        </div>
    );
}
