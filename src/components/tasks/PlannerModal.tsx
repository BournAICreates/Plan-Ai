import { createPortal } from 'react-dom';
import { X, CheckSquare } from 'lucide-react';
import { TaskList } from './TaskList';
import styles from '../notes/Notes.module.css'; // Re-use modal styles

interface PlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PlannerModal({ isOpen, onClose }: PlannerModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div 
            className={styles.modalOverlay} 
            style={{ 
                zIndex: 100000, 
                position: 'fixed', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(8px)'
            }} 
            onClick={onClose}
        >
            <div 
                className={styles.aiModal} 
                style={{ 
                    width: '900px', 
                    maxWidth: '95%', 
                    height: '80vh', 
                    display: 'flex', 
                    flexDirection: 'column',
                    animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.6)',
                }} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', marginRight: '10px'
                        }}>
                            <CheckSquare size={18} />
                        </div>
                        <span>Task Planner</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <TaskList />
                </div>
            </div>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}
