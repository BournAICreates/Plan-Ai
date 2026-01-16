
import { useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { Circle, CheckCircle2 } from 'lucide-react';
import styles from './Dashboard.module.css';

export function ActiveTasks() {
    const { tasks, toggleStatus, addTask } = useTaskStore();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'school' | 'work'>('school');
    const [showAdd, setShowAdd] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'light' | 'medium' | 'urgent'>('medium');
    const [killingTaskIds, setKillingTaskIds] = useState<Set<string>>(new Set());

    const activeTasks = tasks.map(t => ({ ...t, priority: t.priority || 'medium' })).filter(t => { // Backward compact
        // Category Filter
        const matchesCategory = t.category === activeTab || (!t.category && activeTab === 'school');
        if (!matchesCategory) return false;

        // Status Filter
        // If it's done, only show if it's currently animating out
        if (t.status === 'done' && !killingTaskIds.has(t.id)) {
            return false;
        }
        return true;
    });

    const handleToggle = (task: any) => {
        if (!user) return;

        // If it's already done (and somehow visible), just fast toggle back
        if (task.status === 'done') {
            toggleStatus(user.uid, task.id, 'todo');
            return;
        }

        // If it's todo, we animate it out
        setKillingTaskIds(prev => new Set(prev).add(task.id));

        // Wait for animation
        setTimeout(() => {
            toggleStatus(user.uid, task.id, 'done');
            setKillingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }, 500); // 0.5s matches CSS animation
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !user) return;

        try {
            await addTask(user.uid, {
                title: newTaskTitle,
                status: 'todo',
                priority: newTaskPriority, // Use state
                category: activeTab,
                dueDate: new Date()
            });
            setNewTaskTitle('');
            setNewTaskPriority('medium'); // Reset
            setShowAdd(false);
        } catch (error) {
            console.error("Failed to add task", error);
        }
    };

    return (
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>Active Tasks</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-subtle)', padding: '2px', borderRadius: '18px' }}>
                        <button
                            onClick={() => setActiveTab('school')}
                            style={{
                                background: activeTab === 'school' ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === 'school' ? '#fff' : 'var(--color-text-muted)',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '2px 10px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: activeTab === 'school' ? 600 : 400
                            }}
                        >
                            School
                        </button>
                        <button
                            onClick={() => setActiveTab('work')}
                            style={{
                                background: activeTab === 'work' ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === 'work' ? '#fff' : 'var(--color-text-muted)',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '2px 10px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: activeTab === 'work' ? 600 : 400
                            }}
                        >
                            Work
                        </button>
                    </div>
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                        title="Add Task"
                    >
                        <span style={{ fontSize: '1.2rem', lineHeight: 0.8 }}>+</span>
                    </button>
                </div>
            </div>

            {showAdd && (
                <form onSubmit={handleAddTask} style={{ marginBottom: '1rem', padding: '0 4px', display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder={`Add ${activeTab} task...`}
                        className={styles.taskInput}
                        style={{ flex: 1 }}
                        autoFocus
                    />
                    <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        style={{
                            padding: '0 8px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-subtle)',
                            color: 'var(--color-text-main)',
                            fontSize: '0.75rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </form>
            )}

            <div className={`${styles.list} ${styles.scrollableList}`}>
                {activeTasks.length === 0 && !showAdd && (
                    <p className={styles.eventType} style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>
                        No items in {activeTab}.
                    </p>
                )}
                {activeTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const isKilling = killingTaskIds.has(task.id);

                    // Priority Colors
                    const getPriorityColor = (p: string) => {
                        switch (p) {
                            case 'urgent': return 'var(--color-error)';
                            case 'medium': return 'var(--color-warning)';
                            case 'light': return 'var(--color-success)';
                            default: return 'var(--color-text-muted)';
                        }
                    };

                    const priorityColor = getPriorityColor(task.priority);

                    return (
                        <div
                            key={task.id}
                            className={`${styles.taskItem} ${isKilling ? styles.taskCompleting : ''}`}
                            style={{ opacity: isDone ? 0.6 : 1 }}
                        >
                            <button
                                className={styles.taskCheck}
                                onClick={() => handleToggle(task)}
                            >
                                {isDone || isKilling ? <CheckCircle2 size={18} className="text-green-500" style={{ color: 'var(--color-success)' }} /> : <Circle size={18} />}
                            </button>
                            <span style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--color-text-muted)' : 'inherit', transition: 'all 0.3s', flex: 1 }}>
                                {task.title}
                            </span>

                            {/* Priority Badge */}
                            <span style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: `1px solid ${priorityColor}`,
                                color: priorityColor,
                                textTransform: 'capitalize',
                                marginLeft: '8px'
                            }}>
                                {task.priority}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
