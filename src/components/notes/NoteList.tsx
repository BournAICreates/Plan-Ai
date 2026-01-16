import { format } from 'date-fns';
import { Plus, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical, Check } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Notes.module.css';
import { useState, useEffect } from 'react';

import { ConfirmationModal } from '../ui/ConfirmationModal';

export function NoteList() {
    // ... hooks
    const {
        notes,
        folders,
        activeNoteId,
        activeFolderId,
        setActiveNote,
        setActiveFolder,
        addNote,
        deleteNote,
        updateNote,
        addFolder,
        deleteFolder
    } = useNoteStore();
    const { user } = useAuth();
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
    const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);
    const [movingNoteId, setMovingNoteId] = useState<string | null>(null);

    // New state for modal
    const [folderToDelete, setFolderToDelete] = useState<{ id: string, name: string } | null>(null);

    const filteredNotes = activeFolderId
        ? notes.filter(n => n.folderId === activeFolderId)
        : notes;

    const sortedNotes = [...filteredNotes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const handleAddNote = async () => {
        if (user) {
            await addNote(user.uid, activeFolderId);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user && newFolderName.trim()) {
            await addFolder(user.uid, newFolderName.trim());
            setNewFolderName('');
            setIsCreatingFolder(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (activeMenuNoteId) setActiveMenuNoteId(null);
            if (movingNoteId) setMovingNoteId(null);
        };
        if (activeMenuNoteId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenuNoteId, movingNoteId]);

    const handleMoveNote = async (noteId: string, folderId: string | undefined) => {
        if (user) {
            await updateNote(user.uid, noteId, { folderId });
            setActiveMenuNoteId(null);
            setMovingNoteId(null);
        }
    }

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader} style={{ marginBottom: '1rem' }}>
                <span className={styles.sidebarTitle}>Notes</span>
                <button onClick={handleAddNote} className={styles.addButton} aria-label="Create note" title="New Note">
                    <Plus size={20} />
                </button>
            </div>

            {/* Folders Section */}
            <div className={styles.foldersSection}>
                <div
                    className={styles.folderHeader}
                    onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isFoldersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>FOLDERS</span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCreatingFolder(true);
                        }}
                        className={styles.iconButton}
                        title="New Folder"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {isCreatingFolder && (
                    <form onSubmit={handleCreateFolder} style={{ padding: '0.5rem' }}>
                        <input
                            autoFocus
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder Name..."
                            className={styles.folderInput}
                            onBlur={() => setIsCreatingFolder(false)}
                        />
                    </form>
                )}

                {isFoldersExpanded && (
                    <div className={styles.folderList}>
                        <div
                            className={`${styles.folderItem} ${!activeFolderId ? styles.activeFolder : ''}`}
                            onClick={() => setActiveFolder(undefined)}
                        >
                            <Folder size={16} />
                            <span>All Notes</span>
                        </div>
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                className={`${styles.folderItem} ${activeFolderId === folder.id ? styles.activeFolder : ''}`}
                                onClick={() => setActiveFolder(folder.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                                    {activeFolderId === folder.id ? <FolderOpen size={16} /> : <Folder size={16} />}
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                                </div>
                                <button
                                    className={styles.deleteFolderButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFolderToDelete({ id: folder.id, name: folder.name });
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.divider} style={{ margin: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}></div>

            <div className={styles.noteList}>
                {sortedNotes.length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: '0.9rem' }}>
                        No notes found in this folder.
                    </div>
                )}
                {sortedNotes.map((note) => (
                    <div
                        key={note.id}
                        className={`${styles.noteItem} ${note.id === activeNoteId ? styles.active : ''}`}
                        onClick={() => setActiveNote(note.id)}
                        style={{ position: 'relative' }} // For absolute positioning of menu
                    >
                        <div className={styles.noteTitle}>{note.title || 'Untitled'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={styles.noteDate}>{format(note.updatedAt, 'MMM d')}</span>

                            <button
                                className={`${styles.moreButton} ${activeMenuNoteId === note.id ? styles.active : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuNoteId(activeMenuNoteId === note.id ? null : note.id);
                                    setMovingNoteId(null); // Reset moving state when opening menu
                                }}
                            >
                                <MoreVertical size={16} />
                            </button>

                            {/* Context Menu */}
                            {activeMenuNoteId === note.id && (
                                <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
                                    {!movingNoteId ? (
                                        <>
                                            <button
                                                className={styles.menuItem}
                                                onClick={() => setMovingNoteId(note.id)}
                                            >
                                                <Folder size={14} />
                                                Move to...
                                            </button>
                                            <button
                                                className={`${styles.menuItem} ${styles.danger}`}
                                                onClick={() => {
                                                    if (user) deleteNote(user.uid, note.id);
                                                    setActiveMenuNoteId(null);
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete Note
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ padding: '0.5rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button onClick={() => setMovingNoteId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /></button>
                                                Select Folder
                                            </div>
                                            <div className={styles.folderSubmenu}>
                                                <div
                                                    className={styles.folderOption}
                                                    onClick={() => handleMoveNote(note.id, undefined)}
                                                >
                                                    {!note.folderId && <Check size={14} />}
                                                    <span style={{ marginLeft: !note.folderId ? 0 : '1.4rem' }}>Uncategorized</span>
                                                </div>
                                                {folders.map(f => (
                                                    <div
                                                        key={f.id}
                                                        className={styles.folderOption}
                                                        onClick={() => handleMoveNote(note.id, f.id)}
                                                    >
                                                        {note.folderId === f.id && <Check size={14} />}
                                                        <span style={{ marginLeft: note.folderId === f.id ? 0 : '1.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={async () => {
                    if (folderToDelete && user) {
                        // Optimistically reset active folder if we are viewing the one being deleted
                        if (activeFolderId === folderToDelete.id) {
                            setActiveFolder(undefined);
                        }
                        await deleteFolder(user.uid, folderToDelete.id);
                        setFolderToDelete(null);
                    }
                }}
                title="Delete Folder?"
                message={`Are you sure you want to delete "${folderToDelete?.name}"? Notes inside will be kept but moved to 'Uncategorized'.`}
                confirmText="Delete Folder"
                isDangerous={true}
            />
        </div>
    );
}
