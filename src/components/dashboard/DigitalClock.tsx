import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

export function DigitalClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedTime = time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const formattedDate = time.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className={styles.clockContainer}>
            <div className={styles.clockTime}>{formattedTime}</div>
            <div className={styles.clockDate}>{formattedDate}</div>
        </div>
    );
}
