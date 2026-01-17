import { useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { Circle, CheckCircle2, GripVertical } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import styles from './Dashboard.module.css';

export function ActiveTasks() {
    const { tasks, toggleStatus, addTask, updateTaskOrder } = useTaskStore();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'school' | 'work'>('school');
    const [showAdd, setShowAdd] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'light' | 'medium' | 'urgent'>('medium');
    const [killingTaskIds, setKillingTaskIds] = useState<Set<string>>(new Set());
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Filter and sort tasks (store already sorts by order desc, but we filter here)
    const activeTasks = tasks.map(t => ({ ...t, priority: t.priority || 'medium' })).filter(t => {
        const matchesCategory = t.category === activeTab || (!t.category && activeTab === 'school');
        if (!matchesCategory) return false;

        // Show done tasks only if animating out
        if (t.status === 'done' && !killingTaskIds.has(t.id)) {
            return false;
        }
        return true;
    });

    const handleToggle = (task: any) => {
        if (!user) return;

        if (task.status === 'done') {
            toggleStatus(user.uid, task.id, 'todo');
            return;
        }

        setKillingTaskIds(prev => new Set(prev).add(task.id));

        setTimeout(() => {
            toggleStatus(user.uid, task.id, 'done');
            setKillingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }, 500);
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !user) return;

        try {
            await addTask(user.uid, {
                title: newTaskTitle,
                status: 'todo',
                priority: newTaskPriority,
                category: activeTab,
                dueDate: new Date()
            });
            setNewTaskTitle('');
            setNewTaskPriority('medium');
            setShowAdd(false);
        } catch (error) {
            console.error("Failed to add task", error);
        }
    };

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost class or image if needed
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        if (!user || !draggedTaskId || draggedTaskId === targetTaskId) return;

        const draggedIndex = activeTasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = activeTasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Logic: Move dragged task to target index position
        // Since we sort DESCENDING (higher order = top), if we move to targetIndex,
        // we want to be "between" targetIndex-1 and targetIndex (if moving up)
        // or targetIndex and targetIndex+1 (if moving down? No, standard list logic)

        // Simpler: Just put it "Above" the target task regardless of direction?
        // Let's assume dropping ON a task puts it ABOVE that task.

        // We need an order value GREATER than targetTask.order, but LESS than targetTask_Predecessor.order
        const targetOrder = activeTasks[targetIndex].order || 0;
        const prevTask = activeTasks[targetIndex - 1];
        const prevOrder = prevTask ? (prevTask.order || 0) : targetOrder + 200000; // If top, add big buffer

        let newOrder = (targetOrder + prevOrder) / 2;

        await updateTaskOrder(user.uid, draggedTaskId, newOrder);
        setDraggedTaskId(null);
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
                <form onSubmit={handleAddTask} style={{ marginBottom: '1rem', padding: '0 4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder={`Add ${activeTab} task...`}
                        className={styles.taskInput}
                        style={{ flex: 1 }}
                        autoFocus
                    />
                    <div style={{ width: '120px' }}>
                        <CustomSelect
                            value={newTaskPriority}
                            onChange={(val) => setNewTaskPriority(val as any)}
                            options={[
                                { value: 'light', label: 'Light', color: 'var(--color-success)' },
                                { value: 'medium', label: 'Medium', color: 'var(--color-warning)' },
                                { value: 'urgent', label: 'Urgent', color: 'var(--color-error)' }
                            ]}
                        />
                    </div>
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
                    const priorityColor =
                        task.priority === 'urgent' ? 'var(--color-error)' :
                            task.priority === 'medium' ? 'var(--color-warning)' :
                                'var(--color-success)';

                    return (
                        <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, task.id)}
                            className={`${styles.taskItem} ${isKilling ? styles.taskCompleting : ''}`}
                            style={{
                                opacity: isDone ? 0.6 : 1,
                                cursor: 'grab',
                                border: draggedTaskId === task.id ? '1px dashed var(--color-primary)' : undefined,
                                background: draggedTaskId === task.id ? 'var(--color-bg-subtle)' : undefined
                            }}
                        >
                            <div style={{ color: 'var(--color-text-muted)', marginRight: '6px', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                                <GripVertical size={14} />
                            </div>

                            <button
                                className={styles.taskCheck}
                                onClick={() => handleToggle(task)}
                            >
                                {isDone || isKilling ? <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} /> : <Circle size={18} />}
                            </button>
                            <span style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--color-text-muted)' : 'inherit', transition: 'all 0.3s', flex: 1 }}>
                                {task.title}
                            </span>

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
