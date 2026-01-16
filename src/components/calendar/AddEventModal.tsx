import { useState, useEffect } from 'react';
import { X, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import styles from './AddEventModal.module.css';
import { CustomSelect } from '../ui/CustomSelect';
import type { CalendarEvent } from '../../store/useEventStore';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => void;
    onUpdate?: (id: string, title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string) => void;
    selectedDate: Date | null;
    eventToEdit?: CalendarEvent | null;
}

export function AddEventModal({ isOpen, onClose, onAdd, onUpdate, selectedDate, eventToEdit }: AddEventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'work' | 'personal' | 'meeting'>('work');
    const [time, setTime] = useState('09:00');

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setTitle(eventToEdit.title);
                setDescription(eventToEdit.description || '');
                setType(eventToEdit.type as any);
                setTime(format(eventToEdit.start, 'HH:mm'));
            } else {
                setTitle('');
                setDescription('');
                setType('work');
                setTime('09:00');
            }
        }
    }, [isOpen, eventToEdit]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{eventToEdit ? 'Edit Event' : 'Add Event'}</h3>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.body}>
                    <div className={styles.dateDisplay}>
                        {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>

                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            placeholder="Event Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className={styles.field}>
                        <textarea
                            className={styles.textarea}
                            placeholder="Description (Optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label className={styles.label}><Clock size={14} /> Time</label>
                            <input
                                type="time"
                                className={styles.timeInput}
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}><Tag size={14} /> Type</label>
                            <CustomSelect
                                value={type}
                                onChange={(value) => setType(value as any)}
                                options={[
                                    { value: 'work', label: 'Work' },
                                    { value: 'meeting', label: 'Meeting' },
                                    { value: 'personal', label: 'Personal' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button
                        onClick={() => {
                            if (title.trim()) {
                                if (eventToEdit && onUpdate) {
                                    onUpdate(eventToEdit.id, title, type, time, description);
                                } else {
                                    onAdd(title, type, time, description);
                                }
                                onClose();
                            }
                        }}
                        className={styles.addBtn}
                    >
                        {eventToEdit ? 'Update Event' : 'Add Event'}
                    </button>
                </div>
            </div>
        </div>
    );
}
