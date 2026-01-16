import { useState } from 'react';
import { format, isSameDay, addDays, isWithinInterval, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';
import { useEventStore, type CalendarEvent } from '../../store/useEventStore';
import { AddEventModal } from '../calendar/AddEventModal';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Dashboard.module.css';

export function TodaySchedule() {
    const { events, addEvent, updateEvent } = useEventStore();
    const { user } = useAuth();
    const [view, setView] = useState<'today' | 'week'>('today');
    const today = new Date();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

    const todaysEvents = events
        .filter(event => isSameDay(event.start, today))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const nextWeekEvents = events
        .filter(event => {
            const start = startOfDay(addDays(today, 1));
            const end = endOfDay(addDays(today, 7));
            return isWithinInterval(event.start, { start, end });
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const displayedEvents = view === 'today' ? todaysEvents : nextWeekEvents;

    const handleEventClick = (event: CalendarEvent) => {
        setEventToEdit(event);
        setSelectedDate(event.start);
        setIsModalOpen(true);
    };

    const handleAddEvent = async (title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => {
        if (!selectedDate || !user) return;
        const [hours, minutes] = time.split(':').map(Number);
        const start = setMinutes(setHours(selectedDate, hours), minutes);
        await addEvent(user.uid, { title, description, type, start });
    };

    const handleUpdateEvent = async (id: string, title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => {
        if (!user || !selectedDate) return;
        const [hours, minutes] = time.split(':').map(Number);
        const start = setMinutes(setHours(selectedDate, hours), minutes);
        await updateEvent(user.uid, id, { title, type, start, description });
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className={styles.cardTitle}>Schedule</h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px' }}>
                    <button
                        onClick={() => setView('today')}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: view === 'today' ? 'var(--color-bg-main)' : 'transparent',
                            color: view === 'today' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                            boxShadow: view === 'today' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: view === 'today' ? 600 : 400
                        }}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setView('week')}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: view === 'week' ? 'var(--color-bg-main)' : 'transparent',
                            color: view === 'week' ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                            boxShadow: view === 'week' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: view === 'week' ? 600 : 400
                        }}
                    >
                        Next Week
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {displayedEvents.length > 0 ? (
                    displayedEvents.map((event) => (
                        <div
                            key={event.id}
                            className={styles.scheduleItem}
                            onClick={() => handleEventClick(event)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '65px' }}>
                                <span className={styles.time}>{format(event.start, 'h:mm a')}</span>
                                {view === 'week' && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {format(event.start, 'MMM d')}
                                    </span>
                                )}
                            </div>
                            <div className={styles.eventContent}>
                                <div className={styles.eventTitle}>{event.title}</div>
                                <div className={styles.eventType}>{event.type}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>
                        No events scheduled for {view === 'today' ? 'today' : 'the next 7 days'}.
                    </p>
                )}
            </div>

            <AddEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddEvent}
                onUpdate={handleUpdateEvent}
                selectedDate={selectedDate}
                eventToEdit={eventToEdit}
            />
        </div>
    );
}
