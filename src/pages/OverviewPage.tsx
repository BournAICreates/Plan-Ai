import { useState, useEffect } from 'react';
import RGL, { WidthProvider, Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWidgetStore } from '../store/useWidgetStore';
import { WidgetWrapper } from '../components/dashboard/WidgetWrapper';
import { TodaySchedule } from '../components/dashboard/TodaySchedule';
import { DigitalClock } from '../components/dashboard/DigitalClock';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { ActiveTasks } from '../components/dashboard/ActiveTasks';
import { StockTickerWidget } from '../components/dashboard/StockTickerWidget';
import { NewsFeedWidget } from '../components/dashboard/NewsFeedWidget';
import { DailyQuote } from '../components/dashboard/DailyQuote';
import { RecentNotes } from '../components/dashboard/RecentNotes';
import { Plus, LayoutTemplate, RotateCcw } from 'lucide-react';
import styles from '../components/dashboard/Dashboard.module.css';

// Fix import if `Responsive` is not exported as expected or for different versions
const ResponsiveGridLayout = WidthProvider(Responsive || RGL);

const WIDGETS = [
    { id: 'clock', component: DigitalClock, title: 'Clock', minW: 2, minH: 3 },
    { id: 'schedule', component: TodaySchedule, title: 'Schedule', minW: 3, minH: 6 },
    { id: 'weather', component: WeatherWidget, title: 'Weather', minW: 3, minH: 4 },
    { id: 'tasks', component: ActiveTasks, title: 'Active Tasks', minW: 3, minH: 6 },
    { id: 'quote', component: DailyQuote, title: 'Daily Quote', minW: 3, minH: 2 },
    { id: 'stocks', component: StockTickerWidget, title: 'Market Watch', minW: 3, minH: 4 },
    { id: 'news', component: NewsFeedWidget, title: 'News Feed', minW: 3, minH: 6 },
    { id: 'recent-notes', component: RecentNotes, title: 'Recent Notes', minW: 3, minH: 4 },
];

export function OverviewPage() {
    const { layouts, isVisible, updateLayout, resetLayout, toggleVisibility } = useWidgetStore();
    const [mounted, setMounted] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const onLayoutChange = (layout: any) => {
        updateLayout(layout);
    };

    if (!mounted) return null; // Avoid hydration mismatch

    const visibleWidgets = WIDGETS.filter(w => isVisible[w.id]);
    const hiddenWrappers = WIDGETS.filter(w => !isVisible[w.id]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <style>{`
                .react-grid-item.react-grid-placeholder {
                    background: rgba(var(--color-primary-rgb), 0.1) !important;
                    border-radius: var(--radius-lg);
                    opacity: 0.5;
                }
                .react-resizable-handle {
                    opacity: 0.4;
                    transition: opacity 0.2s;
                    bottom: 4px !important;
                    right: 4px !important;
                }
                .react-grid-item:hover .react-resizable-handle {
                    opacity: 1;
                }
                .react-resizable-handle::after {
                    border-right: 2px solid var(--color-primary);
                    border-bottom: 2px solid var(--color-primary);
                }
            `}</style>

            {/* Toolbar */}
            <div style={{
                padding: '1rem 2rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-bg-base)',
                backdropFilter: 'blur(10px)',
                zIndex: 100
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LayoutTemplate size={20} />
                    Overview
                </h2>

                <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                    <button
                        onClick={() => resetLayout()}
                        className={styles.headerBtn}
                        title="Reset Layout"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className={styles.saveBtn}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={16} />
                            Add Widget
                        </button>

                        {showAddMenu && (
                            <>
                                <div
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                                    onClick={() => setShowAddMenu(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '0.5rem',
                                    background: 'var(--color-bg-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '12px',
                                    padding: '0.5rem',
                                    boxShadow: 'var(--shadow-xl)',
                                    width: '220px',
                                    zIndex: 1000,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {hiddenWrappers.length === 0 ? (
                                        <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                            All widgets are visible.
                                        </div>
                                    ) : (
                                        hiddenWrappers.map(widget => (
                                            <button
                                                key={widget.id}
                                                onClick={() => {
                                                    toggleVisibility(widget.id, true);
                                                    setShowAddMenu(false);
                                                }}
                                                style={{
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    color: 'var(--color-text-main)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {widget.title}
                                                <Plus size={14} style={{ opacity: 0.5 }} />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid Layout Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', overflowX: 'hidden' }}>
                <ResponsiveGridLayout
                    className="layout"
                    layouts={layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={30}
                    onLayoutChange={onLayoutChange}
                    draggableHandle=".widget-drag-handle"
                    margin={[16, 16]}
                    compactType="vertical"
                >
                    {visibleWidgets.map(widget => (
                        <div key={widget.id} data-grid={{ w: widget.minW, h: widget.minH, x: 0, y: 0, minW: widget.minW, minH: widget.minH }}>
                            <WidgetWrapper id={widget.id} title={widget.title} style={{ height: '100%' }}>
                                <widget.component />
                            </WidgetWrapper>
                        </div>
                    ))}
                </ResponsiveGridLayout>
            </div>
        </div>
    );
}
