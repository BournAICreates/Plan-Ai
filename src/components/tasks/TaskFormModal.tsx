import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare } from 'lucide-react';
import { useTaskStore, type Task } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { CustomSelect } from '../ui/CustomSelect';
import styles from '../notes/Notes.module.css'; // Re-use modal styles

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: 'school' | 'work';
}

export function TaskFormModal({ isOpen, onClose, initialCategory = 'school' }: TaskFormModalProps) {
    const { addTask } = useTaskStore();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<Task['priority']>('medium');
    const [category, setCategory] = useState<'school' | 'work'>(initialCategory);
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && user) {
            await addTask(user.uid, {
                title,
                status: 'todo',
                priority,
                category,
                description,
                dueDate: new Date()
            });
            setTitle('');
            setPriority('medium');
            setCategory(initialCategory);
            setDescription('');
            onClose();
        }
    };

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
                    width: '500px', 
                    maxWidth: '95%', 
                    height: 'auto',
                    display: 'flex', 
                    flexDirection: 'column',
                    animation: 'modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
                        <span>Create New Task</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalContent} style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Task Title</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="What needs to be done?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                border: '2px solid var(--color-border)',
                                background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-main)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Priority</label>
                            <CustomSelect
                                value={priority}
                                onChange={(val) => setPriority(val as any)}
                                options={[
                                    { value: 'light', label: 'Light', color: '#10b981' },
                                    { value: 'medium', label: 'Medium', color: '#f59e0b' },
                                    { value: 'urgent', label: 'Urgent', color: '#ef4444' }
                                ]}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Category</label>
                            <CustomSelect
                                value={category}
                                onChange={(val) => setCategory(val as any)}
                                options={[
                                    { value: 'school', label: 'School', color: 'var(--color-primary)' },
                                    { value: 'work', label: 'Work', color: '#6366f1' }
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Description (Optional)</label>
                        <textarea
                            placeholder="Add some details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{
                                width: '100%',
                                height: '100px',
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                border: '2px solid var(--color-border)',
                                background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-main)',
                                fontSize: '0.95rem',
                                outline: 'none',
                                resize: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-muted)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={!title.trim()}
                            style={{
                                flex: 2,
                                padding: '0.85rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                opacity: title.trim() ? 1 : 0.6
                            }}
                        >
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
