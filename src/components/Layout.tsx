import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DataSync } from './DataSync';
import styles from './Layout.module.css';

export function Layout() {
    return (
        <div className={styles.container}>
            <DataSync />
            <Sidebar />
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}
