import { useState, useEffect } from 'react';
import { X, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import styles from './AddEventModal.module.css';
import { CustomSelect } from '../ui/CustomSelect';
import { useEventStore, type CalendarEvent } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string, color?: string) => void;
    onUpdate?: (id: string, title: string, type: 'work' | 'personal' | 'meeting', time: string, description: string, color?: string) => void;
    selectedDate: Date | null;
    eventToEdit?: CalendarEvent | null;
}

export function AddEventModal({ isOpen, onClose, onAdd, onUpdate, selectedDate, eventToEdit }: AddEventModalProps) {
    const { user } = useAuth();
    const { saveOverride, overrides } = useEventStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'work' | 'personal' | 'meeting'>('work');
    const [time, setTime] = useState('09:00');
    const [color, setColor] = useState<string>(''); // For overrides or direct color

    const isExternal = eventToEdit?.isExternal;

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setTitle(eventToEdit.title);
                setDescription(eventToEdit.description || '');
                setType(eventToEdit.type as any);
                setTime(format(eventToEdit.start, 'HH:mm'));

                // Load override color if exists, else event color
                if (isExternal && overrides[eventToEdit.id]?.color) {
                    setColor(overrides[eventToEdit.id].color!);
                } else if (!isExternal && eventToEdit.color) {
                    setColor(eventToEdit.color);
                } else {
                    setColor('');
                }
            } else {
                setTitle('');
                setDescription('');
                setType('work');
                setTime('09:00');
                setColor('');
            }
        }
    }, [isOpen, eventToEdit, overrides]);

    if (!isOpen) return null;

    const PRESET_COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
    ];

    const handleSave = async () => {
        if (!title.trim() && !isExternal) return;

        if (isExternal && eventToEdit && user) {
            // Save override
            if (color) {
                await saveOverride(user.uid, eventToEdit.id, { color });
            }
            onClose();
            return;
        }

        if (title.trim()) {
            if (eventToEdit && onUpdate) {
                onUpdate(eventToEdit.id, title, type, time, description, color);
            } else {
                onAdd(title, type, time, description, color);
            }
            onClose();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>
                        {isExternal ? 'Event Details' : (eventToEdit ? 'Edit Event' : 'Add Event')}
                        {isExternal && <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle' }}>Synced</span>}
                    </h3>
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
                            autoFocus={!isExternal}
                            disabled={isExternal}
                            style={isExternal ? { background: '#f3f4f6', cursor: 'default' } : {}}
                        />
                    </div>

                    <div className={styles.field}>
                        <textarea
                            className={styles.textarea}
                            placeholder="Description (Optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            disabled={isExternal}
                            style={isExternal ? { background: '#f3f4f6', cursor: 'default' } : {}}
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
                                disabled={isExternal}
                                style={isExternal ? { background: '#f3f4f6', cursor: 'default' } : {}}
                            />
                        </div>

                        {!isExternal && (
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
                        )}

                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className={styles.label}>Color</label>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'nowrap', alignItems: 'center' }}>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: c,
                                            border: color === c ? '2px solid white' : '2px solid transparent',
                                            boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                    />
                                ))}
                                <button
                                    onClick={() => setColor('')}
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        border: '1px solid #e5e7eb',
                                        background: !color ? '#e5e7eb' : 'white',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Auto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button
                        onClick={handleSave}
                        className={styles.addBtn}
                    >
                        {isExternal ? 'Save Override' : (eventToEdit ? 'Update Event' : 'Add Event')}
                    </button>
                </div>
            </div>
        </div>
    );
}
