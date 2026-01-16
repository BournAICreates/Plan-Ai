import { MonthView } from '../components/calendar/MonthView';

export function CalendarPage() {
    return (
        <div style={{ height: 'calc(100vh - 4rem)' }}>
            <MonthView />
        </div>
    );
}
