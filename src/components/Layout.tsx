import { Outlet } from 'react-router-dom';
import { DataSync } from './DataSync';
import styles from './Layout.module.css';

export function Layout() {
    return (
        <div className={styles.container}>
            <DataSync />
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}
