import { useState } from 'react';
import { format } from 'date-fns';
import { X, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import styles from './Calendar.module.css';
import type { CalendarEvent } from '../../store/useEventStore';
import { useEventStore } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmModal } from './ConfirmModal';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    events: CalendarEvent[];
    onAddEvent: () => void;
    onEditEvent: (event: CalendarEvent) => void;
}

export function DayDetailsModal({ isOpen, onClose, date, events, onAddEvent, onEditEvent }: DayDetailsModalProps) {
    const { user } = useAuth();
    const { deleteEvent, subscriptions } = useEventStore();
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    if (!isOpen || !date) return null;

    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    const confirmDelete = async () => {
        if (user && eventToDelete) {
            await deleteEvent(user.uid, eventToDelete);
            setEventToDelete(null);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1050 }}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className={styles.modalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            background: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <h3 className={styles.modalTitle} style={{ margin: 0 }}>{format(date, 'EEEE')}</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{format(date, 'MMMM d, yyyy')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {sortedEvents.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '12px',
                                color: 'var(--color-text-muted)'
                            }}>
                                No events scheduled for this day.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sortedEvents.map(event => {
                                    const sub = event.subscriptionId ? subscriptions.find(s => s.id === event.subscriptionId) : null;
                                    const subColor = sub?.color || '#7c3aed'; // default purple

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                if (!event.isExternal) {
                                                    onEditEvent(event);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '12px',
                                                padding: '12px',
                                                background: 'var(--color-bg-subtle)',
                                                borderRadius: '12px',
                                                borderLeft: `4px solid ${event.isExternal ? subColor : 'var(--color-primary)'}`,
                                                cursor: event.isExternal ? 'default' : 'pointer',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!event.isExternal) e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!event.isExternal) e.currentTarget.style.transform = 'none';
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '45px',
                                                paddingRight: '12px',
                                                borderRight: '1px solid var(--color-border)'
                                            }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{format(event.start, 'h:mm')}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{format(event.start, 'a')}</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{event.title}</div>
                                                {event.description && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                                        {event.description}
                                                    </div>
                                                )}
                                                {event.isExternal && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '2px 6px',
                                                        background: `${subColor}20`,
                                                        color: subColor,
                                                        borderRadius: '4px',
                                                        marginTop: '6px',
                                                        display: 'inline-block'
                                                    }}>
                                                        External
                                                    </span>
                                                )}
                                            </div>
                                            {!event.isExternal && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEventToDelete(event.id);
                                                    }}
                                                    style={{
                                                        color: 'var(--color-text-muted)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        opacity: 0.6,
                                                        transition: 'opacity 0.2s',
                                                        zIndex: 10
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onAddEvent}
                        className={styles.submitBtn}
                        style={{ display: 'flex', alignItems: 'center', justifySelf: 'center' }}
                    >
                        <Plus size={18} />
                        Add New Event
                    </button>
                </div>

                <ConfirmModal
                    isOpen={!!eventToDelete}
                    onClose={() => setEventToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Delete Event"
                    message="Are you sure you want to delete this event? This action cannot be undone."
                    isDestructive={true}
                    confirmText="Delete"
                />
            </div>
        </div>
    );
}
