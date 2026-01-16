import { useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore, type Task } from '../../store/useTaskStore';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, CheckCircle2, Circle, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import styles from './Tasks.module.css';
import { CustomSelect } from '../ui/CustomSelect';

export function TaskList() {
    const { tasks, addTask, toggleStatus } = useTaskStore();
    const { user } = useAuth();
    const [filter, setFilter] = useState<'all' | 'active' | 'todo' | 'in-progress' | 'done'>('all');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newPriority, setNewPriority] = useState<Task['priority']>('medium');

    const filteredTasks = tasks.filter((t) => {
        if (filter === 'active') return t.status !== 'done';
        if (filter === 'done') return t.status === 'done';
        return true;
    });

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
                    <Plus size={16} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'text-bottom' }} />
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
                {filteredTasks.map((task) => (
                    <div key={task.id} className={styles.taskItem}>
                        <button
                            className={`${styles.checkBtn} ${task.status === 'done' ? styles.checked : ''}`}
                            onClick={() => user && toggleStatus(user.uid, task.id, task.status === 'done' ? 'todo' : 'done')}
                        >
                            {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <div className={styles.content}>
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
                        <button
                            className={styles.deleteBtn}
                            onClick={() => user && tasks.find(t => t.id === task.id) && useTaskStore.getState().deleteTask(user.uid, task.id)}
                            title="Delete Task"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
