import type { ReactNode } from 'react';
import { X, GripVertical } from 'lucide-react';
import { useWidgetStore } from '../../store/useWidgetStore';

interface WidgetWrapperProps {
    id: string;
    title?: string;
    children: ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}

export function WidgetWrapper({ id, title, children, style, className, onMouseDown, onMouseUp, onTouchEnd }: WidgetWrapperProps) {
    const { toggleVisibility } = useWidgetStore();

    return (
        <div
            className={className}
            style={{
                ...style,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: 'var(--color-bg-glass)',
                backdropFilter: 'blur(var(--backdrop-blur))',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            }}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchEnd={onTouchEnd}
        >
            <div
                className="widget-drag-handle"
                style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    cursor: 'grab',
                    padding: '6px',
                    color: 'var(--color-text-muted)',
                    opacity: 0,
                    transition: 'opacity 0.2s, background 0.2s',
                    zIndex: 20,
                    background: 'var(--color-bg-base)',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)'
                }}
                title={title || "Drag Widget"}
            >
                <GripVertical size={16} />
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(id, false);
                }}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '6px',
                    borderRadius: '6px',
                    opacity: 0,
                    transition: 'opacity 0.2s, background 0.2s, color 0.2s',
                    zIndex: 20,
                    boxShadow: 'var(--shadow-sm)'
                }}
                className="widget-close-btn"
                title="Remove Widget"
            >
                <X size={16} />
            </button>

            <style>{`
                .react-grid-item:hover .widget-drag-handle,
                .react-grid-item:hover .widget-close-btn {
                    opacity: 1 !important;
                }
                .widget-close-btn:hover {
                    background: rgba(239, 68, 68, 0.2) !important;
                    color: #ef4444 !important;
                }
                .widget-drag-handle:hover {
                    background: rgba(255, 255, 255, 0.6) !important;
                    color: var(--color-primary) !important;
                }
            `}</style>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                {children}
            </div>
        </div>
    );
}
