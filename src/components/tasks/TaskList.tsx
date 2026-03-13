import { useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore, type Task } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, CheckCircle2, Circle, Calendar as CalendarIcon, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Tasks.module.css';
import { CustomSelect } from '../ui/CustomSelect';

export function TaskList() {
    const { tasks, addTask, toggleStatus, updateTask } = useTaskStore();
    const { user } = useAuth();
    const [filter, setFilter] = useState<'all' | 'active' | 'todo' | 'in-progress' | 'done'>('all');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const filteredTasks = tasks.filter((t) => {
        if (filter === 'active') return t.status !== 'done';
        if (filter === 'done') return t.status === 'done';
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

    const handleAddTaskKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAddTask(e as unknown as React.FormEvent);
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim() && user) {
            addTask(user.uid, {
                title: newTaskTitle,
                status: 'todo',
                priority: newPriority,
                dueDate: new Date()
            });
            setNewTaskTitle('');
            setNewPriority('medium');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Tasks</h1>
            </div>

            <div className={styles.inputGroup}>
                <input
                    type="text"
                    className={styles.addInput}
                    placeholder="Add a new task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleAddTaskKey}
                />
                <CustomSelect
                    value={newPriority}
                    onChange={(value) => setNewPriority(value as Task['priority'])}
                    options={[
                        { value: 'light', label: 'Light', color: '#10b981' },
                        { value: 'medium', label: 'Medium', color: '#f59e0b' },
                        { value: 'urgent', label: 'Urgent', color: '#ef4444' }
                    ]}
                    placeholder="Priority"
                />
                <button className={styles.addBtn} onClick={handleAddTask}>
                    <Plus size={16} />
                    Add Task
                </button>
            </div>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
                    onClick={() => setFilter('active')}
                >
                    Active
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'done' ? styles.active : ''}`}
                    onClick={() => setFilter('done')}
                >
                    Completed
                </button>
            </div>

            <div className={styles.taskList}>
                {filteredTasks.length === 0 && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>No tasks found.</p>}
                {filteredTasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    return (
                        <div key={task.id} className={`${styles.taskItemWrapper} ${isExpanded ? styles.expanded : ''}`}>
                            <div className={styles.taskItem}>
                                <button
                                    className={`${styles.checkBtn} ${task.status === 'done' ? styles.checked : ''}`}
                                    onClick={() => user && toggleStatus(user.uid, task.id, task.status === 'done' ? 'todo' : 'done')}
                                >
                                    {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </button>
                                <div className={styles.content} onClick={() => toggleExpand(task.id)} style={{ cursor: 'pointer' }}>
                                    <span className={`${styles.taskTitle} ${task.status === 'done' ? styles.completed : ''}`}>
                                        {task.title}
                                    </span>
                                    <div className={styles.meta}>
                                        {task.dueDate && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <CalendarIcon size={12} />
                                                {format(task.dueDate, 'MMM d')}
                                            </span>
                                        )}
                                        <span className={`${styles.priority} ${styles[task.priority]}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        className={styles.expandBtn}
                                        onClick={() => toggleExpand(task.id)}
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => user && useTaskStore.getState().deleteTask(user.uid, task.id)}
                                        title="Delete Task"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className={styles.expandedContent}>
                                    <textarea
                                        className={styles.descriptionArea}
                                        placeholder="Add description..."
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
