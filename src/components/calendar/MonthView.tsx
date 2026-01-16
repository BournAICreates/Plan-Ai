import { useState } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, setHours, setMinutes, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEventStore, type CalendarEvent } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';
import { AddEventModal } from './AddEventModal';
import styles from './Calendar.module.css';

export function MonthView() {
    const [viewDate, setViewDate] = useState(new Date());
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const { events, addEvent, updateEvent, deleteEvent } = useEventStore();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

    const handleDayClick = (day: Date) => {
        setEventToEdit(null);
        setSelectedDate(day);
        setIsModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setEventToEdit(event);
        setSelectedDate(event.start);
        setIsModalOpen(true);
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

    const getEventTypeClass = (type: string) => {
        switch (type) {
            case 'work': return styles.typeWork;
            case 'personal': return styles.typePersonal;
            case 'meeting': return styles.typeMeeting;
            default: return '';
        }
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
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
                <div className={styles.grid}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className={styles.dayHeader}>{day}</div>
                    ))}
                    {days.map((day) => {
                        const dayEvents = events.filter((e) => isSameDay(e.start, day));
                        return (
                            <div
                                key={day.toISOString()}
                                className={`${styles.dayCell} ${!isSameMonth(day, monthStart) ? styles.disabled : ''} ${isToday(day) ? styles.today : ''}`}
                                onClick={() => handleDayClick(day)}
                            >
                                <div className={styles.dayNumber}>{format(day, 'd')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {dayEvents.map((e) => (
                                        <div
                                            key={e.id}
                                            className={`${styles.eventPill} ${getEventTypeClass(e.type)}`}
                                            title={`${e.title}${e.description ? '\n' + e.description : ''}`}
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                handleEventClick(e);
                                            }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                {format(e.start, 'h:mm')} {e.title}
                                            </span>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (user) deleteEvent(user.uid, e.id);
                                                }}
                                                title="Delete event"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
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
        </>
    );
}
