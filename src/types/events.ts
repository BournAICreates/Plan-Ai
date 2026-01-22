export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    type: 'meeting' | 'work' | 'personal' | 'routine';
    description?: string;
    isExternal?: boolean;
    subscriptionId?: string;
}

export interface CalendarSubscription {
    id: string;
    url: string;
    name: string;
    color?: string;
    lastError?: string | null;
}
