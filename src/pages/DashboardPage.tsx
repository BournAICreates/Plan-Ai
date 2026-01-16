import { useEffect, useState, useMemo, useRef } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { TodaySchedule } from '../components/dashboard/TodaySchedule';
import { ActiveTasks } from '../components/dashboard/ActiveTasks';

import { RecentNotes } from '../components/dashboard/RecentNotes';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { DigitalClock } from '../components/dashboard/DigitalClock';
import { DailyQuote } from '../components/dashboard/DailyQuote';
import { useAuth } from '../contexts/AuthContext';
import { useLayoutStore } from '../store/useLayoutStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Edit2, Save, GripVertical, Copy, Plus, Clock, CloudSun, Quote, List, CheckSquare, Newspaper, FileText, Trash2, Key, X } from 'lucide-react';
import styles from '../components/dashboard/Dashboard.module.css';

// ... imports
import { NewsFeedWidget } from '../components/dashboard/NewsFeedWidget';
// Removed StockTickerWidget import

const WIDGET_IDEAS = [
    { id: 'clock_digital', name: 'Digital Clock', icon: <Clock size={16} /> },
    { id: 'weather', name: 'Weather', icon: <CloudSun size={16} /> },
    { id: 'quote', name: 'Daily Quote', icon: <Quote size={16} /> },
    { id: 'schedule', name: 'Daily Schedule', icon: <List size={16} /> },
    { id: 'tasks', name: 'Active Tasks', icon: <CheckSquare size={16} /> },
    { id: 'news', name: 'News Feed', icon: <Newspaper size={16} /> },
    { id: 'notes_list', name: 'Notes List', icon: <FileText size={16} /> },
];

const WIDGET_REGISTRY: { [key: string]: React.ComponentType } = {
    schedule: TodaySchedule,
    tasks: ActiveTasks,
    clock: DigitalClock,
    clock_digital: DigitalClock,
    weather: WeatherWidget,
    notes: RecentNotes,
    notes_list: RecentNotes,
    quote: DailyQuote,
    news: NewsFeedWidget,
};

export function DashboardPage() {
    // ... hooks ...
    const { user } = useAuth();
    const { layouts, isEditing, setEditing, loadLayouts, saveLayouts, addWidget, removeWidget } = useLayoutStore();
    const { geminiApiKeys, setGeminiApiKeys } = useSettingsStore();
    const [currentLayouts, setCurrentLayouts] = useState(layouts);
    const [matchSizeMode, setMatchSizeMode] = useState(false);
    const [sourceWidget, setSourceWidget] = useState<string | null>(null);
    const { width, containerRef, mounted } = useContainerWidth();

    // Settings Modal State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [tempKeys, setTempKeys] = useState<string[]>(['', '', '']);

    useEffect(() => {
        if (showSettingsModal) {
            // Pad or trim to ensure we have 3 slots for the UI
            const currentKeys = [...geminiApiKeys];
            while (currentKeys.length < 3) currentKeys.push('');
            setTempKeys(currentKeys.slice(0, 3));
        }
    }, [showSettingsModal, geminiApiKeys]);

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Check API Keys on load
    useEffect(() => {
        // Simple check: do we have at least one non-empty key?
        const hasKeys = geminiApiKeys && geminiApiKeys.some(k => k && k.trim().length > 0);

        if (hasKeys) {
            setNotification({ message: 'API Keys Successful', type: 'success' });
        } else {
            setNotification({ message: 'API Keys Invalid', type: 'error' });
        }

        // Auto dismiss success after 3s
        const timer = setTimeout(() => {
            setNotification(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [geminiApiKeys]);

    // Trash State
    const [isTrashHovered, setIsTrashHovered] = useState(false);
    const trashRef = useRef<HTMLDivElement>(null);
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

    // ... useEffects ...
    useEffect(() => {
        if (user) {
            loadLayouts(user.uid);
        }
    }, [user, loadLayouts]);

    useEffect(() => {
        setCurrentLayouts(layouts);
    }, [layouts]);

    // Force items to be static when not editing to strictly prevent dragging/resizing
    const processedLayouts = useMemo(() => {
        if (isEditing) return currentLayouts;

        const staticLayouts: any = {};
        Object.keys(currentLayouts).forEach(key => {
            staticLayouts[key] = currentLayouts[key]?.map((item: any) => ({
                ...item,
                static: true
            }));
        });
        return staticLayouts;
    }, [currentLayouts, isEditing]);

    const handleLayoutChange = (_: any, allLayouts: any) => {
        if (isEditing) {
            setCurrentLayouts(allLayouts);
        }
    };

    const handleSave = () => {
        if (user) {
            saveLayouts(user.uid, currentLayouts);
            setEditing(false);
            setMatchSizeMode(false);
            setSourceWidget(null);
        }
    };

    const handleMatchSize = (targetKey: string) => {
        if (!matchSizeMode) {
            setSourceWidget(targetKey);
            setMatchSizeMode(true);
        } else if (sourceWidget && sourceWidget !== targetKey) {
            const updatedLayouts = { ...currentLayouts };
            // Use current tracked breakpoint or fallback
            const layout = updatedLayouts[currentBreakpoint];

            if (layout) {
                const sourceItem = layout.find((item: any) => item.i === sourceWidget);
                const targetItem = layout.find((item: any) => item.i === targetKey);

                if (sourceItem && targetItem) {
                    targetItem.w = sourceItem.w;
                    targetItem.h = sourceItem.h;
                    setCurrentLayouts(updatedLayouts);
                }
            }
            setMatchSizeMode(false);
            setSourceWidget(null);
        }
    };

    // Drag to Trash Logic
    const handleDrag = (_layout: any, _oldItem: any, _newItem: any, _placeholder: any, e: any, _element: any) => {
        if (trashRef.current) {
            const trashRect = trashRef.current.getBoundingClientRect();
            // Check if mouse is within trash bounds
            // e might be a MouseEvent or TouchEvent. We assume mouse for desktop or first touch.
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);

            if (
                clientX >= trashRect.left &&
                clientX <= trashRect.right &&
                clientY >= trashRect.top &&
                clientY <= trashRect.bottom
            ) {
                if (!isTrashHovered) setIsTrashHovered(true);
            } else {
                if (isTrashHovered) setIsTrashHovered(false);
            }
        }
    };

    const handleDragStop = (_layout: any, _oldItem: any, newItem: any, _placeholder: any, _e: any, _element: any) => {
        if (isTrashHovered && user) {
            // Remove the widget
            removeWidget(user.uid, newItem.i);
            setIsTrashHovered(false);
        }
    };

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = user?.displayName?.split(' ')[0] || 'Planner';

    const renderWidget = (key: string, Component: React.ComponentType) => (
        <div
            key={key}
            className={`${styles.gridItem} ${isEditing ? styles.gridItemEditing : ''} ${sourceWidget === key ? styles.gridItemSelected : ''}`}
        >
            {isEditing && <div className={styles.dragHandle}><GripVertical size={16} /></div>}
            {isEditing && (
                <button
                    className={`${styles.matchSizeBtn} ${sourceWidget === key ? styles.matchSizeBtnActive : ''}`}
                    onClick={() => handleMatchSize(key)}
                    title={!matchSizeMode ? "Click to copy size from this widget" : sourceWidget === key ? "Selected as source" : "Click to match size to selected widget"}
                >
                    <Copy size={14} />
                </button>
            )}
            <Component />
        </div>
    );

    const [showAddMenu, setShowAddMenu] = useState(false);

    // gridLayouts now directly uses processedLayouts
    const gridLayouts = useMemo(() => {
        return processedLayouts;
    }, [processedLayouts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showAddMenu && !(event.target as Element).closest(`.${styles.addWidgetContainer}`)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddMenu]);

    // Active widgets for rendering
    const activeLayoutItems = currentLayouts[currentBreakpoint] || [];

    return (
        <div ref={containerRef} style={{ position: 'relative', minHeight: '100vh', paddingBottom: '100px' }}>
            <div className={styles.dashboardHeader}>
                <div className={styles.greetingSection}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                        {greeting}, {firstName}.
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Here's what's on your plate today.</p>
                </div>

                <div className={styles.editActions}>
                    {!isEditing ? (
                        <>
                            <div className={styles.addWidgetContainer}>
                                <button
                                    className={styles.addWidgetBtn}
                                    onClick={() => setShowAddMenu(!showAddMenu)}
                                    title="Add Widget"
                                >
                                    <Plus size={20} />
                                </button>
                                {showAddMenu && (
                                    <div className={styles.widgetDropdown}>
                                        <h4 style={{ margin: '0 0 0.5rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Available Widgets</h4>
                                        {WIDGET_IDEAS.map(widget => (
                                            <div
                                                key={widget.id}
                                                className={styles.widgetOption}
                                                onClick={() => {
                                                    if (user) {
                                                        addWidget(user.uid, widget.id);
                                                        setShowAddMenu(false);
                                                    }
                                                }}
                                            >
                                                <span className={styles.widgetOptionIcon}>{widget.icon}</span>
                                                {widget.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                onClick={() => setShowSettingsModal(true)}
                                title="Configure AI Keys"
                            >
                                <Key size={16} />
                                API Keys
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                onClick={() => setEditing(true)}
                            >
                                <Edit2 size={16} />
                                Edit Layout
                            </button>
                        </>
                    ) : (
                        <>
                            {matchSizeMode && (
                                <div className={styles.matchSizeHint}>
                                    <Copy size={14} />
                                    Click another widget to match size
                                </div>
                            )}
                            <button
                                className={`${styles.actionBtn} ${styles.saveBtn}`}
                                onClick={handleSave}
                            >
                                <Save size={16} />
                                Save Layout
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.grid}>
                {mounted && (
                    <Responsive
                        className="layout"
                        layouts={gridLayouts}
                        width={width}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 12, sm: 12, xs: 1, xxs: 1 }}
                        rowHeight={30}
                        // @ts-ignore - Prop exists in RGL but types are strict
                        draggableHandle={isEditing ? `.${styles.dragHandle}` : undefined}
                        isDraggable={isEditing}
                        isResizable={isEditing}
                        resizeHandles={['se', 's', 'e']}
                        onLayoutChange={handleLayoutChange}
                        onBreakpointChange={(bp) => setCurrentBreakpoint(bp)}
                        onDrag={handleDrag}
                        onDragStop={handleDragStop}
                        margin={[24, 24]}
                    >
                        {activeLayoutItems.map(item => {
                            // Enhanced component resolution
                            let Component = WIDGET_REGISTRY[item.i];
                            if (!Component) {
                                // Try matched by prefix for dynamically added widgets (e.g. weather_123456)
                                const registryKeys = Object.keys(WIDGET_REGISTRY).sort((a, b) => b.length - a.length);
                                const match = registryKeys.find(key => item.i.startsWith(key));
                                if (match) Component = WIDGET_REGISTRY[match];
                            }

                            // Fallback
                            Component = Component || WIDGET_REGISTRY['clock'];

                            if (!Component) return null;
                            return renderWidget(item.i, Component);
                        })}
                    </Responsive>
                )}
            </div>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '100%', maxWidth: '600px' }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>AI Configuration</h3>
                            <button className={styles.closeBtn} onClick={() => setShowSettingsModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                                <label className={styles.label}>Primary Gemini API Key</label>
                                <input
                                    type="password"
                                    className={styles.input}
                                    value={tempKeys[0]}
                                    onChange={(e) => {
                                        const newKeys = [...tempKeys];
                                        newKeys[0] = e.target.value;
                                        setTempKeys(newKeys);
                                    }}
                                    placeholder="Enter your primary Google Gemini API Key"
                                />
                            </div>

                            <div style={{ padding: '1rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-main)' }}>Backup Keys (Optional)</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    These keys will be used if the primary key hits a rate limit or fails.
                                </p>
                                <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                    <label className={styles.label} style={{ fontSize: '0.85rem' }}>Backup Key 1</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={tempKeys[1]}
                                        onChange={(e) => {
                                            const newKeys = [...tempKeys];
                                            newKeys[1] = e.target.value;
                                            setTempKeys(newKeys);
                                        }}
                                        placeholder="Optional backup key"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label} style={{ fontSize: '0.85rem' }}>Backup Key 2</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={tempKeys[2]}
                                        onChange={(e) => {
                                            const newKeys = [...tempKeys];
                                            newKeys[2] = e.target.value;
                                            setTempKeys(newKeys);
                                        }}
                                        placeholder="Optional backup key"
                                    />
                                </div>
                            </div>

                            <p className={styles.helpText} style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Required for AI Tutor, Flashcard Generation, and Text Enhancement features.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowSettingsModal(false)}>Cancel</button>
                            <button
                                className={styles.saveBtn}
                                onClick={() => {
                                    // Filter out empty keys
                                    const cleanKeys = tempKeys.filter(k => k.trim() !== '');
                                    setGeminiApiKeys(cleanKeys);
                                    setShowSettingsModal(false);
                                }}
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trash Drop Zone */}
            {isEditing && (
                <div
                    ref={trashRef}
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '200px',
                        height: '80px',
                        background: isTrashHovered ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-bg-subtle)',
                        border: `2px dashed ${isTrashHovered ? '#ef4444' : 'var(--color-border)'}`,
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isTrashHovered ? '#ef4444' : 'var(--color-text-muted)',
                        transition: 'all 0.2s',
                        zIndex: 1000,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <Trash2 size={24} style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                        {isTrashHovered ? 'Drop to Remove' : 'Drag here to remove'}
                    </span>
                </div>
            )}
            {/* API Key Status Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: notification.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 2000,
                    animation: 'slideIn 0.3s ease-out',
                    fontWeight: 500
                }}>
                    {notification.type === 'success' ? <CheckSquare size={18} /> : <X size={18} />}
                    {notification.message}
                    <button
                        onClick={() => setNotification(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            marginLeft: '10px',
                            opacity: 0.8
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div >
    );
}
