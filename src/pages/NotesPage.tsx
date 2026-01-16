import { NoteList } from '../components/notes/NoteList';
import { NoteEditor } from '../components/notes/NoteEditor';
import styles from '../components/notes/Notes.module.css';

export function NotesPage() {
    return (
        <div className={styles.container}>
            <NoteList />
            <NoteEditor />
        </div>
    );
}
