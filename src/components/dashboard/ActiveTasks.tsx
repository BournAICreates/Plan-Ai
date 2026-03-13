import { useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, GripVertical, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { PlannerModal } from '../tasks/PlannerModal';
import { TaskFormModal } from '../tasks/TaskFormModal';
import styles from '../tasks/Tasks.module.css';

export function ActiveTasks() {
    const { tasks, toggleStatus, updateTaskOrder, updateTask } = useTaskStore();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'school' | 'work'>('school');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPlanner, setShowPlanner] = useState(false);
    const [killingTaskIds, setKillingTaskIds] = useState<Set<string>>(new Set());
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

    const toggleExpand = (taskId: string) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedTasks(newExpanded);
    };

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

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        if (!user || !draggedTaskId || draggedTaskId === targetTaskId) return;

        const draggedIndex = activeTasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = activeTasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const targetOrder = activeTasks[targetIndex].order || 0;
        const prevTask = activeTasks[targetIndex - 1];
        const prevOrder = prevTask ? (prevTask.order || 0) : targetOrder + 200000;

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
                        onClick={() => setShowAddModal(true)}
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
                    <button
                        onClick={() => setShowPlanner(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                        title="Enlarge View"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            <PlannerModal isOpen={showPlanner} onClose={() => setShowPlanner(false)} />
            <TaskFormModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                initialCategory={activeTab}
            />

            <div className={styles.taskList} style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {activeTasks.length === 0 && (
                    <p className={styles.eventType} style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>
                        No items in {activeTab}.
                    </p>
                )}
                {activeTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const isKilling = killingTaskIds.has(task.id);
                    const isExpanded = expandedTasks.has(task.id);

                    return (
                        <div key={task.id} className={`${styles.taskItemWrapper} ${isExpanded ? styles.expanded : ''} ${isKilling ? styles.taskCompleting : ''}`}
                            style={{
                                opacity: isDone ? 0.6 : 1,
                                border: draggedTaskId === task.id ? '1px dashed var(--color-primary)' : undefined,
                                background: draggedTaskId === task.id ? 'var(--color-bg-subtle)' : undefined,
                                margin: '4px 0'
                            }}
                        >
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, task.id)}
                                className={styles.taskItem}
                                style={{
                                    cursor: 'grab',
                                    padding: '0.75rem 1rem'
                                }}
                            >
                                <div className={styles.dragHandle}>
                                    <GripVertical size={16} />
                                </div>

                                <button
                                    className={`${styles.checkbox} ${(isDone || isKilling) ? styles.checked : ''}`}
                                    onClick={() => handleToggle(task)}
                                >
                                    {(isDone || isKilling) && <CheckCircle2 size={16} color="white" />}
                                </button>

                                <span className={`${styles.taskTitle} ${isDone ? styles.completed : ''}`} style={{ flex: 1, fontSize: '0.95rem' }} onClick={() => toggleExpand(task.id)}>
                                    {task.title}
                                </span>

                                <div className={styles.actions} style={{ opacity: isExpanded ? 1 : undefined, transform: isExpanded ? 'none' : undefined }}>
                                    <button
                                        className={styles.expandBtn}
                                        onClick={() => toggleExpand(task.id)}
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>

                                <span className={`${styles.priority} ${styles[task.priority]}`}>
                                    {task.priority}
                                </span>
                            </div>
                            {isExpanded && (
                                <div className={styles.expandedContent} style={{ padding: '0 1rem 1rem 3rem' }}>
                                    <textarea
                                        className={styles.descriptionArea}
                                        placeholder="Add description..."
                                        style={{ minHeight: '60px', fontSize: '0.85rem' }}
                                        value={task.description || ''}
                                        onChange={(e) => user && updateTask(user.uid, task.id, { description: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
