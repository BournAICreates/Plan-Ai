import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskStore } from '../store/useTaskStore';
import { useNoteStore } from '../store/useNoteStore';
import { useEventStore } from '../store/useEventStore';


export function DataSync() {
    const { user } = useAuth();
    const { subscribe: subscribeTasks } = useTaskStore();
    const { subscribe: subscribeNotes } = useNoteStore();
    const { subscribe: subscribeEvents } = useEventStore();


    useEffect(() => {
        console.log('[DataSync] Effect triggered. User:', user ? user.uid : 'null');
        if (user) {
            console.log('[DataSync] Subscribing to stores...');
            subscribeTasks(user.uid);
            subscribeNotes(user.uid);
            subscribeEvents(user.uid);

        }
    }, [user, subscribeTasks, subscribeNotes, subscribeEvents]);

    return null;
}
