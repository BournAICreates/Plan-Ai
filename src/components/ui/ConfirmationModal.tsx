import { AlertTriangle, X } from 'lucide-react';
import styles from '../notes/Notes.module.css'; // Re-use existing modal styles

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
            <div className={styles.aiModal} style={{ maxWidth: '400px', width: '90%', height: 'auto', maxHeight: 'none', overflow: 'hidden' }}>
                <div className={styles.modalHeader} style={{ borderBottom: 'none', paddingBottom: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isDangerous ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDangerous ? 'var(--color-error)' : 'var(--color-primary)'
                        }}>
                            <AlertTriangle size={18} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>{title}</h3>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent} style={{ padding: '1.5rem', paddingTop: '0' }}>
                    <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-main)',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isDangerous ? '#ef4444' : '#3b82f6', // Hardcoded red/blue to ensure it's not white
                                color: '#000000', // Explicit black text
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                boxShadow: isDangerous ? '0 2px 8px rgba(239, 68, 68, 0.3)' : '0 2px 8px rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
