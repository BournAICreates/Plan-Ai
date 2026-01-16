import { useNoteStore } from '../../store/useNoteStore';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

export function RecentNotes() {
    const notes = useNoteStore((state) => state.notes);
    const setActiveNote = useNoteStore((state) => state.setActiveNote);
    const navigate = useNavigate();

    const recentNotes = notes.slice(0, 1);

    const handleNoteClick = (id: string) => {
        setActiveNote(id);
        navigate('/notes');
    };

    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Notes</h2>
            <div className={styles.list}>
                {recentNotes.length > 0 ? (
                    recentNotes.map((note) => (
                        <div
                            key={note.id}
                            className={styles.scheduleItem}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleNoteClick(note.id)}
                        >
                            <div className={styles.time} style={{ width: 'auto', textAlign: 'left' }}>
                                <FileText size={18} />
                            </div>
                            <div className={styles.eventContent}>
                                <div className={styles.eventTitle}>{note.title || 'Untitled Note'}</div>
                                <div className={styles.eventType}>
                                    Updated {format(note.updatedAt, 'MMM d, h:mm a')}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>
                        No notes yet. Start writing!
                    </p>
                )}
            </div>
        </div>
    );
}
