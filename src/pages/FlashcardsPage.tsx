import { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { StudyModal } from '../components/notes/StudyModal';
import { useAuth } from '../contexts/AuthContext';
import styles from '../components/dashboard/Dashboard.module.css';

export function FlashcardsPage() {
    const { notes } = useNoteStore();
    useAuth();
    const [selectedNote, setSelectedNote] = useState<{ id: string, content: string } | null>(null);

    // Filter out empty notes if desired, but user might want to generate for them.
    // Let's just show all notes.
    const sortedNotes = [...notes].sort((a, b) =>
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className={styles.dashboardHeader}>
                <div className={styles.greetingSection}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <GraduationCap size={32} style={{ color: 'var(--color-primary)' }} />
                        Flashcards
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Select a note to study or create new flashcards.</p>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginTop: '1rem'
            }}>
                {sortedNotes.map(note => (
                    <div
                        key={note.id}
                        className={styles.card}
                        style={{ cursor: 'pointer', height: 'auto', minHeight: '180px', justifyContent: 'space-between' }}
                        onClick={() => setSelectedNote({ id: note.id, content: note.content })}
                    >
                        <div>
                            <h3 className={styles.cardTitle} style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
                                {note.title || 'Untitled Note'}
                            </h3>
                            <p style={{
                                color: 'var(--color-text-muted)',
                                fontSize: '0.875rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {note.content.replace(/<[^>]*>/g, '') || 'No content...'}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--color-border)'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {note.updatedAt?.toLocaleDateString()}
                            </span>
                            <button className={styles.iconButton} style={{ borderRadius: 'var(--radius-full)', background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {sortedNotes.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
                        <p>No notes found. Create a note first to generate flashcards.</p>
                    </div>
                )}
            </div>

            <StudyModal
                isOpen={!!selectedNote}
                onClose={() => setSelectedNote(null)}
                noteId={selectedNote?.id || ''}
                noteContent={selectedNote?.content || ''}
            />
        </div>
    );
}
