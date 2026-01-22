
import { useState } from 'react';
import { X, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Calendar.module.css'; // We'll reuse or add styles

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const { user } = useAuth();
    const { subscriptions, addSubscription, removeSubscription, loadingImported, importedEvents } = useEventStore();
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !url || !name) return;

        try {
            await addSubscription(user.uid, url, name);
            setUrl('');
            setName('');
            setError('');
        } catch (err) {
            setError('Failed to add subscription. Check URL.');
            console.error(err);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.subIconWrapper} style={{ width: '48px', height: '48px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
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
                                    return (
                                        <div key={sub.id} className={styles.subscriptionItem}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className={styles.subIconWrapper} style={{ width: '36px', height: '36px' }}>
                                                    <Calendar size={18} />
                                                </div>
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
                                                    {eventCount === 0 && (
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
