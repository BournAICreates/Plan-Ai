import { useState, useEffect } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, setHours, setMinutes, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { useEventStore, type CalendarEvent } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';
import { AddEventModal } from './AddEventModal';
import { SubscriptionModal } from './SubscriptionModal';
import styles from './Calendar.module.css';

import { DayDetailsModal } from './DayDetailsModal';
import { ConfirmModal } from './ConfirmModal';

export function MonthView() {
    const [viewDate, setViewDate] = useState(new Date());
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    // Start on Monday (1)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const { events, importedEvents, overrides, subscriptions, fetchSubscriptions, addEvent, updateEvent, deleteEvent, loadingImported, syncError } = useEventStore();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    // Fetch subscriptions on mount
    useEffect(() => {
        if (user) {
            fetchSubscriptions(user.uid);
        }
    }, [user]);

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDayDetailsOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setEventToEdit(event);
        setSelectedDate(event.start);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, eventId: string) => {
        e.stopPropagation();
        setEventToDelete(eventId);
    };

    const confirmDelete = async () => {
        if (user && eventToDelete) {
            await deleteEvent(user.uid, eventToDelete);
            setEventToDelete(null);
        }
    };

    const handleAddEvent = async (title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => {
        if (!selectedDate || !user) return;

        const [hours, minutes] = time.split(':').map(Number);
        const start = setMinutes(setHours(selectedDate, hours), minutes);

        await addEvent(user.uid, {
            title,
            description,
            type,
            start
        });
    };

    const handleUpdateEvent = async (id: string, title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => {
        if (!user || !selectedDate) return;

        const [hours, minutes] = time.split(':').map(Number);
        const start = setMinutes(setHours(selectedDate, hours), minutes);

        await updateEvent(user.uid, id, {
            title,
            type,
            start,
            description
        });
    };

    const getEventTypeClass = (type: string, isExternal?: boolean) => {
        if (isExternal) return ''; // We will handle external styles inline
        switch (type) {
            case 'work': return styles.typeWork;
            case 'personal': return styles.typePersonal;
            case 'meeting': return styles.typeMeeting;
            default: return '';
        }
    };

    const allEvents = [...events, ...importedEvents];

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className={styles.monthNavigation}>
                            <button onClick={handlePrevMonth} className={styles.navBtn} title="Previous Month">
                                <ChevronLeft size={20} />
                            </button>
                            <h2 className={styles.monthTitle}>{format(viewDate, 'MMMM yyyy')}</h2>
                            <button onClick={handleNextMonth} className={styles.navBtn} title="Next Month">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            className={styles.subscribeBtn}
                            onClick={() => setIsSubModalOpen(true)}
                            title="Sync External Calendar"
                        >
                            <LinkIcon size={14} />
                            Sync Calendar
                        </button>
                        {loadingImported && (
                            <div style={{ marginLeft: '10px', width: '16px', height: '16px', border: '2px solid var(--color-primary-subtle)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} title="Syncing..." />
                        )}
                        {syncError && (
                            <div style={{ marginLeft: '10px', color: 'var(--color-error)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }} title={syncError}>
                                ⚠️
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.grid}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className={styles.dayHeader}>{day}</div>
                    ))}
                    {days.map((day) => {
                        const dayEvents = allEvents.filter((e) => isSameDay(e.start, day));
                        // Sort events by time
                        dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

                        return (
                            <div
                                key={day.toISOString()}
                                className={`${styles.dayCell} ${!isSameMonth(day, monthStart) ? styles.disabled : ''} ${isToday(day) ? styles.today : ''}`}
                                onClick={() => handleDayClick(day)}
                            >
                                <div className={styles.dayNumber}>{format(day, 'd')}</div>
                                <div
                                    className={styles.eventsContainer}
                                // Removed stopPropagation so clicking empty space triggers day click
                                >
                                    {dayEvents.map((e) => {
                                        const sub = e.subscriptionId ? subscriptions.find(s => s.id === e.subscriptionId) : null;

                                        // Override Logic
                                        const overrideColor = overrides[e.id]?.color;
                                        const subColor = overrideColor || (sub ? sub.color : null);

                                        const customStyle = subColor ? {
                                            backgroundColor: `${subColor}20`,
                                            color: subColor,
                                            borderLeftColor: subColor
                                        } : {};

                                        return (
                                            <div
                                                key={e.id}
                                                className={`${styles.eventPill} ${getEventTypeClass(e.type, e.isExternal)}`}
                                                style={customStyle}
                                                title={`${e.title}${e.description ? '\n' + e.description : ''}`}
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    handleEventClick(e);
                                                }}
                                            >
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                    {format(e.start, 'h:mm')} {e.title}
                                                </span>
                                                {!e.isExternal && (
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={(ev) => handleDeleteClick(ev, e.id)}
                                                        title="Delete event"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AddEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddEvent}
                onUpdate={handleUpdateEvent}
                selectedDate={selectedDate}
                eventToEdit={eventToEdit}
            />
            <SubscriptionModal
                isOpen={isSubModalOpen}
                onClose={() => setIsSubModalOpen(false)}
            />
            <DayDetailsModal
                isOpen={isDayDetailsOpen}
                onClose={() => setIsDayDetailsOpen(false)}
                date={selectedDate}
                events={selectedDate ? allEvents.filter(e => isSameDay(e.start, selectedDate)) : []}
                onAddEvent={() => {
                    setIsDayDetailsOpen(false);
                    setEventToEdit(null);
                    setIsModalOpen(true);
                }}
                onEditEvent={(event) => {
                    setIsDayDetailsOpen(false);
                    handleEventClick(event);
                }}
            />
            <ConfirmModal
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                isDestructive={true}
                confirmText="Delete"
            />
        </>
    );
}
