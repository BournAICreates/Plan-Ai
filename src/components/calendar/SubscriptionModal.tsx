import { useState } from 'react';
import { X, Trash2, Calendar, AlertTriangle, Check } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Calendar.module.css';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRESET_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#64748b'  // Slate
];

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const { user } = useAuth();
    const { subscriptions, addSubscription, removeSubscription, updateSubscription, loadingImported, importedEvents } = useEventStore();
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    // State for editing a subscription
    const [editingSubId, setEditingSubId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !url || !name) return;

        try {
            await addSubscription(user.uid, url, name); // removed color arg, defaults will be used
            setUrl('');
            setName('');
            setError('');
        } catch (err) {
            setError('Failed to add subscription. Check URL.');
            console.error(err);
        }
    };

    const handleUpdateColor = async (subId: string, newColor: string) => {
        if (!user) return;
        await updateSubscription(user.uid, subId, { color: newColor });
        setEditingSubId(null);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.subIconWrapper} style={{
                            width: '48px',
                            height: '48px',
                            background: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px'
                        }}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '1.2rem' }}>Calendar Sync</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Integrate external calendars</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
                            How to sync Apple Calendar
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                            1. Open Calendar app on iPhone/Mac<br />
                            2. Tap <b>(i)</b> next to your calendar<br />
                            3. Turn on <b>Public Calendar</b><br />
                            4. Copy the "webcal://" link and paste it below
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Calendar Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Work Calendar, Family"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Public URL</label>
                            <input
                                type="url"
                                className={styles.input}
                                value={url}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (val.startsWith('webcal://')) {
                                        val = val.replace('webcal://', 'https://');
                                    }
                                    setUrl(val);
                                }}
                                placeholder="Paste your calendar link here..."
                                required
                            />
                        </div>

                        {error && (
                            <div style={{
                                color: 'var(--color-error)',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}
                        <button type="submit" className={styles.submitBtn} disabled={loadingImported}>
                            {loadingImported ? 'Verifying Link...' : 'Add Calendar'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700 }}>Active Subscriptions</h4>
                        {subscriptions.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '12px',
                                color: 'var(--color-text-muted)'
                            }}>
                                No calendars synced yet
                            </div>
                        ) : (
                            <div className={styles.subscriptionList}>
                                {subscriptions.map(sub => {
                                    const eventCount = importedEvents.filter(e => e.subscriptionId === sub.id).length;
                                    const subColor = sub.color || '#34d399';
                                    const isEditing = editingSubId === sub.id;

                                    return (
                                        <div key={sub.id} className={styles.subscriptionItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <button
                                                        onClick={() => setEditingSubId(isEditing ? null : sub.id)}
                                                        className={styles.subIconWrapper}
                                                        style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            background: `${subColor}20`,
                                                            color: subColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Click to change color"
                                                    >
                                                        <Calendar size={18} />
                                                    </button>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {sub.name}
                                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', background: eventCount > 0 ? '#d1fae5' : '#fee2e2', color: eventCount > 0 ? '#059669' : '#b91c1c' }}>
                                                                {eventCount} events
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {sub.url}
                                                        </div>
                                                        {sub.lastError && (
                                                            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <AlertTriangle size={12} />
                                                                <span>{sub.lastError}</span>
                                                            </div>
                                                        )}
                                                        {!sub.lastError && eventCount === 0 && (
                                                            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <AlertTriangle size={12} />
                                                                <span>Apple often takes 1-24h to populate new public links.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => user && removeSubscription(user.uid, sub.id)}
                                                    style={{
                                                        color: 'var(--color-text-muted)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = '#ef4444';
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = 'var(--color-text-muted)';
                                                        e.currentTarget.style.background = 'none';
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {isEditing && (
                                                <div style={{
                                                    marginTop: '12px',
                                                    padding: '12px',
                                                    background: 'var(--color-bg-canvas)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    gap: '8px',
                                                    flexWrap: 'wrap',
                                                    animation: 'fadeIn 0.2s ease'
                                                }}>
                                                    {PRESET_COLORS.map((c) => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => handleUpdateColor(sub.id, c)}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: c,
                                                                border: subColor === c ? '2px solid var(--color-bg-surface)' : '2px solid transparent',
                                                                boxShadow: subColor === c ? `0 0 0 2px ${c}` : 'none',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                transition: 'transform 0.2s'
                                                            }}
                                                        >
                                                            {subColor === c && <Check size={12} strokeWidth={3} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
