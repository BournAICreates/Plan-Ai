// @ts-ignore
import * as GridLayout from 'react-grid-layout';
import { useState, useEffect } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWidgetStore } from '../store/useWidgetStore';
import { WidgetWrapper } from '../components/dashboard/WidgetWrapper';
import { DigitalClock } from '../components/dashboard/DigitalClock';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { ActiveTasks } from '../components/dashboard/ActiveTasks';
import { DailyQuote } from '../components/dashboard/DailyQuote';
import { Plus, CheckSquare, RotateCcw, Lock, Unlock } from 'lucide-react';
import styles from '../components/dashboard/Dashboard.module.css';

// ----------------------------------------------------------------------
// Robust Import Strategy (With CSS Grid Fallback)
// ----------------------------------------------------------------------

// 1. Try to get RGL from the default import
let RGL_Ref: any = GridLayout;

// 2. Check various locations where the library might be hiding
if (!RGL_Ref && (window as any).ReactGridLayout) {
    RGL_Ref = (window as any).ReactGridLayout;
}

// 3. Extract necessary components safely
const WidthProvider = RGL_Ref?.WidthProvider || RGL_Ref?.default?.WidthProvider || (window as any).ReactGridLayout?.WidthProvider;
const Responsive = RGL_Ref?.Responsive || RGL_Ref?.default?.Responsive || (window as any).ReactGridLayout?.Responsive;

// 4. Construct the component OR null if failed
const LayoutEngine = (WidthProvider && Responsive) ? WidthProvider(Responsive) : null;

const WIDGETS = [
    { id: 'clock', component: DigitalClock, title: 'Clock', minW: 2, minH: 2, area: 'clock' },
    { id: 'weather', component: WeatherWidget, title: 'Weather', minW: 3, minH: 3, area: 'weather' },
    { id: 'tasks', component: ActiveTasks, title: 'Active Tasks', minW: 3, minH: 4, area: 'tasks' },
    { id: 'quote', component: DailyQuote, title: 'Daily Quote', minW: 3, minH: 2, area: 'quote' },
];

export function DashboardOverview() {
    const { layouts, isVisible, updateLayout, resetLayout, toggleVisibility } = useWidgetStore();
    const [mounted, setMounted] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [isDraggable, setIsDraggable] = useState(true); // Default to unlocked for immediate interactivity

    useEffect(() => {
        setMounted(true);
        const hasLegacyWidgets = layouts.lg?.some(l => !['clock', 'weather', 'tasks', 'quote'].includes(l.i));
        if (hasLegacyWidgets || (layouts.lg && layouts.lg.length === 0)) {
            resetLayout();
        }
    }, []);

    const onLayoutChange = (layout: any) => {
        updateLayout(layout);
    };

    if (!mounted) return null;

    const visibleWidgets = WIDGETS.filter(w => isVisible[w.id]);
    const hiddenWrappers = WIDGETS.filter(w => !isVisible[w.id]);

    // Determine if we are using the Advanced Engine (RGL) or Simple Engine (CSS Grid)
    const canUseDragAndDrop = !!LayoutEngine;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <style>{`
                .react-grid-item.react-grid-placeholder {
                    background: rgba(56, 189, 248, 0.2) !important;
                    border-radius: 16px;
                    opacity: 0.5;
                }
                .react-resizable-handle {
                    opacity: 0;
                    transition: opacity 0.2s;
                    bottom: 8px !important;
                    right: 8px !important;
                    width: 20px;
                    height: 20px;
                    cursor: nwse-resize;
                }
                .react-grid-item:hover .react-resizable-handle {
                    opacity: ${isDraggable ? 1 : 0};
                }
                .react-resizable-handle::after {
                    content: '';
                    position: absolute;
                    right: 3px;
                    bottom: 3px;
                    width: 8px;
                    height: 8px;
                    border-right: 2px solid var(--color-primary);
                    border-bottom: 2px solid var(--color-primary);
                }
                .widget-drag-handle {
                    display: ${isDraggable ? 'flex' : 'none'} !important;
                }
                .widget-close-btn {
                    display: ${isDraggable ? 'flex' : 'none'} !important;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Toolbar */}
            <div style={{
                padding: '1.25rem 2.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                zIndex: 100,
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                    <CheckSquare size={24} className="text-primary" style={{ color: 'var(--color-primary)' }} />
                    Tasks
                </h2>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {canUseDragAndDrop && (
                        <button
                            onClick={() => setIsDraggable(!isDraggable)}
                            className={styles.headerBtn}
                            title={isDraggable ? "Lock Layout" : "Edit Layout"}
                            style={{
                                background: isDraggable ? 'var(--color-bg-subtle)' : 'transparent',
                                color: isDraggable ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                border: isDraggable ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
                            }}
                        >
                            {isDraggable ? <Unlock size={16} /> : <Lock size={16} />}
                            {isDraggable ? 'Layout Unlocked' : 'Layout Locked'}
                        </button>
                    )}



                    <button
                        onClick={() => resetLayout()}
                        className={styles.headerBtn}
                        title="Reset Layout"
                    >
                        <RotateCcw size={16} />
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className={styles.createBtn}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '99px', fontSize: '0.9rem' }}
                        >
                            <Plus size={18} />
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
                                    top: '120%',
                                    right: 0,
                                    background: 'var(--color-bg-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '16px',
                                    padding: '0.5rem',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                    width: '240px',
                                    zIndex: 1000,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {hiddenWrappers.length === 0 ? (
                                        <div style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
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
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.95rem',
                                                    fontWeight: 500,
                                                    color: 'var(--color-text-main)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {widget.title}
                                                <Plus size={16} className="text-primary" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', overflowX: 'hidden', background: 'radial-gradient(circle at top, rgba(255,255,255,0.8), rgba(248,250,252,0.8))' }}>
                <div style={{ maxWidth: '1600px', margin: '0 auto', height: '100%' }}>

                    {/* OPTION A: RGL Engine */}
                    {LayoutEngine && (
                        <LayoutEngine
                            className="layout"
                            layouts={layouts}
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            rowHeight={60}
                            onLayoutChange={onLayoutChange}
                            draggableHandle=".widget-drag-handle"
                            margin={[24, 24]}
                            containerPadding={[0, 0]}
                            compactType="vertical"
                            isDraggable={isDraggable}
                            isResizable={isDraggable}
                        >
                            {visibleWidgets.map(widget => (
                                <div key={widget.id}
                                    data-grid={{ w: widget.minW, h: widget.minH, x: 0, y: 0, minW: widget.minW, minH: widget.minH }}
                                    style={{ transition: isDraggable ? 'none' : 'box-shadow 0.3s, transform 0.3s' }}
                                >
                                    <WidgetWrapper id={widget.id} title={widget.title} style={{ height: '100%' }}>
                                        <widget.component />
                                    </WidgetWrapper>
                                </div>
                            ))}
                        </LayoutEngine>
                    )}

                    {/* OPTION B: CSS Grid Fallback (Shown if Engine is null) */}
                    {!LayoutEngine && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            gridAutoRows: 'minmax(180px, auto)',
                            gap: '1.5rem',
                            height: '100%',
                            alignContent: 'start'
                        }}>
                            {/* Clock: Top Left */}
                            {isVisible['clock'] && (
                                <div style={{ gridColumn: 'span 3', gridRow: 'span 2', opacity: 0, animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0s' }}>
                                    <WidgetWrapper id="clock" title="Clock" style={{ height: '100%' }}>
                                        <DigitalClock />
                                    </WidgetWrapper>
                                </div>
                            )}

                            {/* Weather: Top Mid */}
                            {isVisible['weather'] && (
                                <div style={{ gridColumn: 'span 3', gridRow: 'span 2', opacity: 0, animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0.1s' }}>
                                    <WidgetWrapper id="weather" title="Weather" style={{ height: '100%' }}>
                                        <WeatherWidget />
                                    </WidgetWrapper>
                                </div>
                            )}

                            {/* Tasks: Right Half */}
                            {isVisible['tasks'] && (
                                <div style={{ gridColumn: 'span 6', gridRow: 'span 4', opacity: 0, animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0.2s' }}>
                                    <WidgetWrapper id="tasks" title="Active Tasks" style={{ height: '100%' }}>
                                        <ActiveTasks />
                                    </WidgetWrapper>
                                </div>
                            )}

                            {/* Quote: Bottom Left */}
                            {isVisible['quote'] && (
                                <div style={{ gridColumn: 'span 3', gridRow: 'span 2', opacity: 0, animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0.3s' }}>
                                    <WidgetWrapper id="quote" title="Daily Quote" style={{ height: '100%' }}>
                                        <DailyQuote />
                                    </WidgetWrapper>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
