import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, Notebook, Command, LogOut, Sun, Moon, GraduationCap, ClipboardPen } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useTheme } from '../contexts/ThemeContext';
import styles from './Sidebar.module.css';

const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/notes', label: 'Notes', icon: Notebook },
    { path: '/flashcards', label: 'Flashcards', icon: GraduationCap },
    { path: '/tests', label: 'Tests', icon: ClipboardPen },
];

export function Sidebar() {
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h1 className={styles.logo}>
                    <Command size={24} style={{ strokeWidth: 3, color: 'var(--color-primary)' }} />
                    Plan.ai
                </h1>
            </div>
            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `${styles.link} ${isActive ? styles.active : ''}`
                        }
                    >
                        <item.icon size={20} style={{ strokeWidth: 2 }} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className={styles.footer}>
                <button onClick={toggleTheme} className={styles.logoutBtn} style={{ marginBottom: '0.5rem' }}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button onClick={() => auth.signOut()} className={styles.logoutBtn}>
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
