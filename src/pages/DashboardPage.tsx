import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import {
    Plus, ArrowRight, Paperclip, MoreHorizontal, Settings,
    User, FileText, Layers, HelpCircle, Command, X, LogOut, Key, Folder,
    BookOpen, Clock, Headphones, Video, Brain, FileBox, FileStack,
    Database, Layout as LayoutIcon, PenTool, Sparkles, FolderInput, Sun, Moon, Calendar, Trash2, Puzzle
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { StudyModal } from '../components/notes/StudyModal';
import { TestModal } from '../components/notes/TestModal';
import { NoteEditor } from '../components/notes/NoteEditor';
import { useTheme } from '../contexts/ThemeContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

import { MonthView } from '../components/calendar/MonthView';
import { DashboardOverview } from './DashboardOverview';
import { ActiveTasks } from '../components/dashboard/ActiveTasks';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { MatchingModal } from '../components/notes/MatchingModal';
import { chatWithTutor, chatWithTutorMultimodal } from '../lib/gemini';
import { Bot } from 'lucide-react';



function formatMarkdown(text: string): string {
    if (!text) return '';
    let html = text
        // Convert **bold** to <strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Convert *italic* to <em>
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Convert ### headings
        .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:0.9rem;margin:0.75rem 0 0.25rem">$1</div>')
        // Convert ## headings
        .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:0.95rem;margin:0.75rem 0 0.25rem">$1</div>')
        // Convert numbered lists
        .replace(/^\d+\.\s+(.+)$/gm, '<div style="padding-left:1rem;margin:0.35rem 0">• $1</div>')
        // Convert bullet points (- or *)
        .replace(/^[-*]\s+(.+)$/gm, '<div style="padding-left:1rem;margin:0.35rem 0">• $1</div>')
        // Convert double newlines to spacing
        .replace(/\n\n/g, '<div style="height:0.6rem"></div>')
        // Convert remaining single newlines to breaks
        .replace(/\n/g, '<br/>');
    return html;
}

import styles from '../components/dashboard/Dashboard.module.css';

const STUDIO_ITEMS = [
    { id: 'audio', label: 'Audio Overview', icon: Headphones },
    { id: 'video', label: 'Video Overview', icon: Video },
    { id: 'mindmap', label: 'Mind Map', icon: Brain },
    { id: 'reports', label: 'Reports', icon: FileBox },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'infographic', label: 'Infographic', icon: LayoutIcon },
    { id: 'slide', label: 'Slide Deck', icon: FileStack },
    { id: 'data', label: 'Data Table', icon: Database },
    { id: 'matching', label: 'Matching Game', icon: Puzzle },
];


interface OverlayProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    items: any[];
    onItemClick: (item: any) => void;
}

function FolderOverlay({ title, isOpen, onClose, items, onItemClick }: OverlayProps) {
    const [view, setView] = useState<'all' | 'folders'>('folders');
    const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
    const { folders } = useNoteStore();

    // Reset local state when closing
    useEffect(() => {
        if (!isOpen) {
            setView('folders');
            setSelectedFolderId(undefined);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const foldersWithItems = folders.filter(f => items.some(i => i.folderId === f.id));
    const uncategorizedItems = items.filter(i => !i.folderId);

    // Filter items based on view
    let displayedItems = items;
    if (view === 'all') {
        if (selectedFolderId === null) {
            displayedItems = items.filter(i => !i.folderId);
        } else if (selectedFolderId !== undefined) {
            displayedItems = items.filter(i => i.folderId === selectedFolderId);
        }
    }

    return (
        <div className={styles.fullOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={styles.overlayHeader}>
                <div className={styles.overlayTitleGroup}>
                    <h2 className={styles.overlayTitle}>{title}</h2>
                    <div className={styles.overlayTabs}>
                        <button
                            className={`${styles.overlayTab} ${view === 'folders' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setView('folders');
                                setSelectedFolderId(undefined);
                            }}
                        >
                            Folders
                        </button>
                        <button
                            className={`${styles.overlayTab} ${view === 'all' && selectedFolderId === undefined ? styles.activeTab : ''}`}
                            onClick={() => {
                                setView('all');
                                setSelectedFolderId(undefined);
                            }}
                        >
                            All {title}
                        </button>
                    </div>
                </div>
                <button className={styles.closeOverlay} onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <div className={styles.overlayContent}>
                {view === 'folders' ? (
                    <div className={styles.folderGrid}>
                        {foldersWithItems.map(folder => (
                            <div key={folder.id} className={styles.folderCard} onClick={() => {
                                setSelectedFolderId(folder.id);
                                setView('all');
                            }}>
                                <Folder size={40} className={styles.folderIcon} />
                                <div className={styles.folderInfo}>
                                    <h3>{folder.name}</h3>
                                    <span>{items.filter(i => i.folderId === folder.id).length} items</span>
                                </div>
                            </div>
                        ))}
                        {uncategorizedItems.length > 0 && (
                            <div className={styles.folderCard} onClick={() => {
                                setSelectedFolderId(null);
                                setView('all');
                            }}>
                                <Folder size={40} className={styles.folderIcon} style={{ opacity: 0.5 }} />
                                <div className={styles.folderInfo}>
                                    <h3>Uncategorized</h3>
                                    <span>{uncategorizedItems.length} items</span>
                                </div>
                            </div>
                        )}
                        <div className={styles.createFolderCard}>
                            <Plus size={32} />
                            <span>Create New Folder</span>
                        </div>
                    </div>
                ) : (
                    <div className={styles.itemGrid}>
                        {selectedFolderId !== undefined && (
                            <div className={styles.itemCard} style={{ background: 'rgba(var(--color-primary-rgb), 0.05)', border: '1px dashed var(--color-primary)', cursor: 'pointer' }} onClick={() => { setView('folders'); setSelectedFolderId(undefined); }}>
                                <ArrowRight size={20} style={{ transform: 'rotate(180deg)', color: 'var(--color-primary)' }} />
                                <div className={styles.itemDetails}>
                                    <h4 style={{ color: 'var(--color-primary)' }}>Back to Folders</h4>
                                    <span style={{ fontSize: '0.75rem' }}>
                                        Viewing: {selectedFolderId === null ? 'Uncategorized' : folders.find(f => f.id === selectedFolderId)?.name}
                                    </span>
                                </div>
                            </div>
                        )}

                        {displayedItems.map(item => (

                            <div key={item.id} className={styles.itemCard} onClick={() => onItemClick(item)}>
                                <BookOpen size={20} className={styles.itemIcon} />
                                <div className={styles.itemDetails}>
                                    <h4>{item.title}</h4>
                                    <div className={styles.itemMeta}>
                                        <Clock size={12} />
                                        <span>{item.updatedAt?.toLocaleDateString()}</span>
                                        {item.folderId && (
                                            <span className={styles.folderTag}>
                                                {folders.find(f => f.id === item.folderId)?.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight size={18} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


export function DashboardPage() {


    const navigate = useNavigate();
    const { notes, folders, activeFolderId, setActiveFolder, setActiveNote, activeNoteId, addNote, updateNote, addFolder, deleteFolder } = useNoteStore();


    const [overlayType, setOverlayType] = useState<'quiz' | 'flashcards' | 'matching' | null>(null);
    const [selectedStudyNote, setSelectedStudyNote] = useState<any | null>(null);
    const [selectedTestNote, setSelectedTestNote] = useState<any | null>(null);
    const [selectedMatchingNote, setSelectedMatchingNote] = useState<any | null>(null);


    const { geminiApiKeys, setGeminiApiKeys } = useSettingsStore();
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const { theme, setTheme } = useTheme();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showPlanner, setShowPlanner] = useState(false);
    const [isPlannerClosing, setIsPlannerClosing] = useState(false);

    const [showTasks, setShowTasks] = useState(false);
    const [isTasksClosing, setIsTasksClosing] = useState(false);

    const handleClosePlanner = () => {
        setIsPlannerClosing(true);
        setTimeout(() => {
            setShowPlanner(false);
            setIsPlannerClosing(false);
        }, 450);
    };

    const handleCloseTasks = () => {
        setIsTasksClosing(true);
        setTimeout(() => {
            setShowTasks(false);
            setIsTasksClosing(false);
        }, 450);
    };

    const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<any | null>(null);

    // New Folder Modal
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Folder Context Menu
    const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: any } | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<any | null>(null);

    // Note Context Menu
    const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; note: any } | null>(null);

    const [tempKeys, setTempKeys] = useState<string[]>(['', '', '']);




    // AI Assistant State
    const [messages, setMessages] = useState<any[]>([
        { id: '1', role: 'assistant', content: 'Hello! I\'m your AI assistant. How can I help you with your notes today?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [attachedImages, setAttachedImages] = useState<{ data: string; mimeType: string; preview: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const handleSendChat = async () => {
        const hasImages = attachedImages.length > 0;
        if (!chatInput.trim() && !hasImages) return;
        if (isChatLoading) return;

        const geminiApiKeys = useSettingsStore.getState().geminiApiKeys;
        if (!geminiApiKeys || geminiApiKeys.length === 0) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Please add your Gemini API keys in the settings to use the AI assistant."
            }]);
            return;
        }

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: chatInput || (hasImages ? `[Sent ${attachedImages.length} image${attachedImages.length > 1 ? 's' : ''}]` : ''),
            images: hasImages ? attachedImages.map(img => img.preview) : undefined
        };
        const imagesToSend = [...attachedImages];
        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setAttachedImages([]);
        setIsChatLoading(true);

        try {
            const activeNote = notes.find(n => n.id === activeNoteId);
            const systemContext = `You are a powerful AI Assistant and Expert Document Organizer. 
            CURRENT NOTE CONTENT (HTML):
            ${activeNote?.content || "(No note selected)"}

            CAPABILITIES:
            1. Help research and answer questions.
            2. Edit and organize the current note.

            RESPONSE STYLE:
            - Be concise. Use short sentences.
            - Use bullet points and numbered lists when listing info.
            - Bold key terms with **term**.
            - Add line breaks between sections for readability.
            - Avoid long paragraphs — prefer spaced-out, scannable formatting.
            
            RETURN FORMAT:
            - If providing a FULL REPLACEMENT of the note, wrap HTML in :::REPLACE_NOTE_START::: and :::REPLACE_NOTE_END:::
            - If providing NEW CONTENT to insert, wrap HTML in :::INSERT_CONTENT_START::: and :::INSERT_CONTENT_END:::
            `;

            let responseText: string;
            if (imagesToSend.length > 0) {
                responseText = await chatWithTutorMultimodal(
                    geminiApiKeys,
                    systemContext,
                    userMessage.content,
                    imagesToSend.map(img => ({ data: img.data, mimeType: img.mimeType }))
                );
            } else {
                responseText = await chatWithTutor(geminiApiKeys, systemContext, userMessage.content);
            }

            const replaceMatch = responseText.match(/:::REPLACE_NOTE_START:::([\s\S]*?):::REPLACE_NOTE_END:::/);
            const insertMatch = responseText.match(/:::INSERT_CONTENT_START:::([\s\S]*?):::INSERT_CONTENT_END:::/);

            let visibleResponse = responseText
                .replace(/:::REPLACE_NOTE_START:::[\s\S]*?:::REPLACE_NOTE_END:::/, '')
                .replace(/:::INSERT_CONTENT_START:::[\s\S]*?:::INSERT_CONTENT_END:::/, '')
                .trim();

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: visibleResponse || (replaceMatch ? "I've restructured your note." : (insertMatch ? "I've generated some content for you." : responseText)),
                pendingUpdate: replaceMatch ? replaceMatch[1].trim() : (insertMatch ? insertMatch[1].trim() : undefined),
                updateType: replaceMatch ? 'replace' : (insertMatch ? 'insert' : undefined)
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered an error. Please check your API keys or try again."
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleApplyUpdate = async (msgId: string, content: string, type: 'replace' | 'insert') => {
        if (!activeNoteId) return;
        const { updateNote } = useNoteStore.getState();
        const user = auth.currentUser;
        if (!user) return;


        try {
            if (type === 'replace') {
                await updateNote(user.uid, activeNoteId, { content });
            } else {
                // For insertion, we'd ideally use the editor instance, 
                // but since it's decoupled here, we'll just append for now
                const activeNote = notes.find(n => n.id === activeNoteId);
                const newContent = (activeNote?.content || '') + content;
                await updateNote(user.uid, activeNoteId, { content: newContent });
            }

            setMessages(prev => prev.map(m =>
                m.id === msgId ? {
                    ...m,
                    content: m.content + `\n\n(Changes ${type === 'replace' ? 'applied' : 'inserted'}!)`,
                    pendingUpdate: undefined
                } : m
            ));
        } catch (err) {
            console.error(err);
        }
    };

    // Filter notes for Quizzes (those with testStats) and Flashcards (Total collection)
    const quizNotes = notes.filter(n => n.testStats && n.testStats.testsTaken > 0);
    const flashcardNotes = notes;

    // Filter notes for the sidebar list
    // Filter notes for the sidebar list
    const filteredSidebarNotes = (activeFolderId && activeFolderId !== 'all' ? notes.filter(n => n.folderId === activeFolderId) : notes).filter(n => !n.deletedAt);




    useEffect(() => {
        if (showSettingsModal) {
            const currentKeys = [...geminiApiKeys];
            while (currentKeys.length < 3) currentKeys.push('');
            setTempKeys(currentKeys.slice(0, 3));
        }
    }, [showSettingsModal, geminiApiKeys]);

    const handleSignOut = async () => {
        await auth.signOut();
        navigate('/login');
    };


    return (
        <div className={styles.notebookContainer}>
            {/* Top Header */}
            <header className={styles.topHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.logoIcon}>
                        <Command size={18} />
                    </div>
                    <span className={styles.notebookTitle} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        Plan.ai
                    </span>

                    <div className={styles.mainNav}>
                        <button className={styles.navBtn} onClick={() => {
                            if (showPlanner) handleClosePlanner();
                            else if (showTasks) handleCloseTasks();
                            else navigate('/');
                        }}>

                            <FileText size={16} />
                            Main
                        </button>
                        <button className={styles.navBtn} onClick={() => setShowPlanner(true)}>
                            <Calendar size={16} />
                            Planner
                        </button>

                    </div>
                </div>

                <div className={styles.headerRight}>

                    <button className={styles.headerBtn} onClick={() => setShowSettingsModal(true)}>
                        <Key size={16} />
                        Import Key
                    </button>


                    <div className={styles.profileContainer}>
                        <div
                            className={styles.profileIcon}
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <User size={18} style={{ color: 'var(--color-primary)' }} />
                        </div>

                        {showProfileMenu && (
                            <div className={styles.profileMenu}>
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className={styles.menuItem}
                                >
                                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                                <button onClick={handleSignOut} className={styles.menuItem}>
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>

                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area - Restored 3 Column for Studio */}
            <main className={styles.mainContent}>

                {/* Left Panel: Sources */}
                <aside className={styles.sidePanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Sources</h2>
                        <LayoutIcon size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>

                    <button
                        className={styles.addSourceBtn}
                        onClick={() => {
                            const user = auth.currentUser;
                            if (user) {
                                addNote(user.uid, activeFolderId && activeFolderId !== 'all' ? activeFolderId : undefined);
                            }
                        }}
                    >
                        <Plus size={18} />
                        Add note
                    </button>




                    {activeFolderId ? (
                        <>
                            <button
                                onClick={() => setActiveFolder(undefined)}
                                className={styles.headerBtn}
                                style={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    marginBottom: '1rem',
                                    background: 'rgba(var(--color-primary-rgb), 0.05)',
                                    borderColor: 'var(--color-primary)',
                                    color: 'var(--color-primary)'
                                }}
                            >
                                <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                                Back to All Folders
                            </button>

                            <div className={styles.addSourceBtn} style={{ cursor: 'default', background: 'transparent', border: '1px solid var(--color-border)' }}>
                                <Folder size={18} />
                                {activeFolderId === 'all' ? 'All Sources' : (folders.find(f => f.id === activeFolderId)?.name || 'Folder')}
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                className={styles.addSourceBtn}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    setNewFolderName('');
                                    setShowNewFolderModal(true);
                                }}
                                title="Create a new folder"
                            >
                                <Folder size={18} />
                                Your Folders
                                <Plus size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                            </button>

                            <div className={styles.folderList} style={{ padding: '0 0.5rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setActiveFolder('all')}
                                    className={`${styles.folderBtn} ${!activeFolderId ? styles.folderBtnActive : ''}`}
                                    style={{ color: !activeFolderId ? undefined : 'var(--color-text-muted)' }}
                                >
                                    <Layers size={14} />
                                    All Sources
                                </button>
                                {folders.map((folder, i) => (
                                    <button
                                        key={folder.id}
                                        onClick={() => setActiveFolder(folder.id)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setFolderContextMenu({ x: e.clientX, y: e.clientY, folder });
                                        }}
                                        className={`${styles.folderBtn} ${activeFolderId === folder.id ? styles.folderBtnActive : ''}`}
                                        style={{
                                            color: activeFolderId === folder.id ? undefined : 'var(--color-text-muted)',
                                            animationDelay: `${(i + 1) * 0.05}s`
                                        }}
                                    >
                                        <Folder size={14} />
                                        {folder.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}



                    {activeFolderId && (
                        <div className={styles.noteList} style={{ padding: '0 0.5rem', marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {filteredSidebarNotes.map((note, i) => (
                                <div
                                    key={note.id}
                                    className={`${styles.noteItem} ${activeNoteId === note.id ? styles.noteItemActive : ''}`}
                                    style={{ animationDelay: `${i * 0.04}s` }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setNoteContextMenu({ x: e.clientX, y: e.clientY, note });
                                    }}
                                >
                                    <button
                                        onClick={() => setActiveNote(note.id)}
                                        className={styles.noteBtn}
                                    >
                                        <BookOpen size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                                        <span style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {note.title || 'Untitled Note'}
                                        </span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMovingNoteId(movingNoteId === note.id ? null : note.id);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '6px',
                                            cursor: 'pointer',
                                            color: 'var(--color-text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: '6px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        title="Move to folder"
                                    >
                                        <FolderInput size={14} />
                                    </button>

                                    {movingNoteId === note.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: '0.5rem',
                                            width: '180px',
                                            background: 'var(--color-bg-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '10px',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            zIndex: 100,
                                            padding: '4px',
                                            marginTop: '4px'
                                        }}>
                                            <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Move to Folder
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const user = auth.currentUser;
                                                    if (user) updateNote(user.uid, note.id, { folderId: undefined });
                                                    setMovingNoteId(null);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    fontSize: '0.8rem',
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    color: 'var(--color-text-main)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <Layers size={14} style={{ opacity: 0.7 }} />
                                                Uncategorized
                                            </button>
                                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                {folders.map(folder => (
                                                    <button
                                                        key={folder.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const user = auth.currentUser;
                                                            if (user) updateNote(user.uid, note.id, { folderId: folder.id });
                                                            setMovingNoteId(null);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            fontSize: '0.8rem',
                                                            textAlign: 'left',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            color: 'var(--color-text-main)'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Folder size={14} style={{ opacity: 0.7 }} />
                                                        {folder.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredSidebarNotes.length === 0 && (
                                <p style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>
                                    {`No notes found in this ${activeFolderId === 'all' ? 'collection' : 'folder'}.`}
                                </p>
                            )}
                        </div>
                    )}


                    <div style={{ flex: 0, minHeight: '180px', maxHeight: '250px', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <ActiveTasks />
                    </div>

                </aside>

                <section className={styles.centerPanel} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        {notes.find(n => n.id === activeNoteId) ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                                <button
                                    onClick={() => setActiveNote(undefined)}
                                    style={{
                                        position: 'absolute',
                                        top: '1.5rem',
                                        right: '1.5rem',
                                        zIndex: 10,
                                        background: 'var(--color-bg-subtle)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-muted)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                                <NoteEditor />


                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
                                <div className={styles.panelHeader} style={{ padding: '1.5rem', position: 'relative', zIndex: 2 }}>
                                    <h2 className={styles.panelTitle}>Note</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Settings size={18} style={{ color: 'var(--color-text-muted)' }} />
                                        <MoreHorizontal size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                </div>

                                {/* Foreground content */}
                                <div className={styles.emptyChat} style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        width: '280px',
                                        marginBottom: '2rem',
                                        pointerEvents: 'auto',
                                        opacity: 1
                                    }}>
                                        <WeatherWidget />
                                    </div>
                                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Start By Opening a Note</h1>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                        Select a note from the sidebar or create a new one
                                    </p>

                                </div>
                            </div>
                        )}

                    </div>

                    {/* Attached Image Previews */}
                    {attachedImages.length > 0 && (
                        <div style={{
                            margin: '0 1.5rem', padding: '0.5rem 0.75rem',
                            display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
                            background: 'var(--color-bg-subtle)', borderRadius: '12px 12px 0 0',
                            borderBottom: 'none'
                        }}>
                            {attachedImages.map((img, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img
                                        src={img.preview}
                                        alt={`Attached ${i + 1}`}
                                        style={{
                                            width: '48px', height: '48px', borderRadius: '8px',
                                            objectFit: 'cover', border: '2px solid var(--color-border)'
                                        }}
                                    />
                                    <button
                                        onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                                        style={{
                                            position: 'absolute', top: '-6px', right: '-6px',
                                            width: '18px', height: '18px', borderRadius: '50%',
                                            background: '#ef4444', color: 'white', border: 'none',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                                            lineHeight: 1, padding: 0
                                        }}
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* AI Chat Input */}
                    <div style={{
                        margin: '0 1.5rem 1.5rem', flexShrink: 0,
                        border: '2px solid var(--color-border)',
                        borderRadius: attachedImages.length > 0 ? '0 0 16px 16px' : '16px',
                        padding: '0.5rem 0.5rem 0.5rem 1rem',
                        background: 'var(--color-bg-surface)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
                            }
                        }}
                    >
                        <button
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = 'image/*,.txt,.pdf,.doc,.docx,.md,.csv,.json';
                                input.onchange = () => {
                                    if (input.files) {
                                        Array.from(input.files).forEach(file => {
                                            if (file.type.startsWith('image/')) {
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    const base64 = reader.result as string;
                                                    setAttachedImages(prev => [...prev, {
                                                        data: base64,
                                                        mimeType: file.type,
                                                        preview: base64
                                                    }]);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        });
                                    }
                                };
                                input.click();
                            }}
                            title="Attach files"
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '6px', borderRadius: '8px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-text-muted)', transition: 'color 0.2s, background 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Paperclip size={18} />
                        </button>
                        <input
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                padding: '0.6rem 0', color: 'var(--color-text-main)', fontSize: '0.95rem',
                                fontFamily: 'inherit'
                            }}
                            placeholder="Ask the AI anything..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendChat();
                            }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', opacity: 0.6 }}>{notes.length} sources</span>
                        <button
                            onClick={handleSendChat}
                            disabled={(!chatInput.trim() && attachedImages.length === 0) || isChatLoading}
                            style={{
                                width: 36, height: 36, borderRadius: '12px',
                                background: (chatInput.trim() || attachedImages.length > 0) ? 'linear-gradient(135deg, var(--color-primary), #6366f1)' : 'var(--color-bg-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                border: 'none', cursor: (chatInput.trim() || attachedImages.length > 0) ? 'pointer' : 'default',
                                transition: 'all 0.2s', flexShrink: 0,
                                boxShadow: (chatInput.trim() || attachedImages.length > 0) ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                            }}
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </section>


                {/* Right Panel: Studio (RESTORED) */}
                <aside className={styles.sidePanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Studio</h2>
                        <LayoutIcon size={18} style={{ color: 'var(--color-text-muted)' }} />
                    </div>

                    <div className={styles.studioGrid} style={{ flex: messages.length > 0 ? '0 0 auto' : '1 1 auto' }}>
                        {STUDIO_ITEMS.map((item) => (
                            <div
                                key={item.id}
                                className={styles.studioCard}
                                onClick={() => {
                                    if (item.id === 'quiz') setOverlayType('quiz');
                                    else if (item.id === 'flashcards') setOverlayType('flashcards');
                                    else if (item.id === 'matching') setOverlayType('matching');
                                }}
                            >
                                <item.icon className={styles.studioCardIcon} size={16} />
                                <span className={styles.studioCardLabel}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '1rem',
                        display: 'flex', flexDirection: 'column', gap: '1rem',
                        border: '1px solid rgba(0, 0, 0, 0.8)',
                        borderRadius: '14px',
                        margin: '1rem 0.75rem 0.75rem',
                        background: 'var(--color-bg-subtle)'
                    }}>
                        {messages.length === 0 ? (
                            <div className={styles.emptyState}>
                                <PenTool size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    Studio output will be saved here.<br />
                                    After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                        alignItems: 'flex-start'
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
                                        }}>
                                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                        </div>
                                        <div style={{
                                            background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                                            color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                            padding: '0.75rem',
                                            borderRadius: '10px',
                                            maxWidth: '85%',
                                            fontSize: '0.85rem',
                                            boxShadow: 'var(--shadow-sm)',
                                            border: '1px solid var(--color-border)'
                                        }}>
                                            {msg.images && msg.images.length > 0 && (
                                                <div style={{ display: 'flex', gap: '6px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                                    {msg.images.map((src: string, i: number) => (
                                                        <img
                                                            key={i}
                                                            src={src}
                                                            alt={`Shared ${i + 1}`}
                                                            style={{
                                                                width: '60px', height: '60px', borderRadius: '8px',
                                                                objectFit: 'cover', border: '1px solid rgba(255,255,255,0.3)'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {msg.role === 'assistant' ? (
                                                <div
                                                    style={{ lineHeight: 1.7 }}
                                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                                />
                                            ) : (
                                                msg.content
                                            )}
                                            {msg.pendingUpdate && (
                                                <button
                                                    onClick={() => handleApplyUpdate(msg.id, msg.pendingUpdate!, msg.updateType!)}
                                                    style={{
                                                        marginTop: '0.5rem',
                                                        width: '100%',
                                                        padding: '0.4rem',
                                                        background: 'var(--color-primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Apply to Note
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ width: '28px', height: '28px', background: 'var(--color-bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} /></div>
                                        <div className={styles.loadingDots}><span></span><span></span><span></span></div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </aside>

            </main>

            {/* Overlays */}
            <FolderOverlay
                title="Practice Tests"
                isOpen={overlayType === 'quiz'}
                onClose={() => setOverlayType(null)}
                items={quizNotes}
                onItemClick={(note) => {
                    setSelectedTestNote(note);
                    setOverlayType(null);
                }}
            />
            <FolderOverlay
                title="Flashcards from Notes"
                isOpen={overlayType === 'flashcards'}
                onClose={() => setOverlayType(null)}
                items={flashcardNotes}
                onItemClick={(note) => {
                    setSelectedStudyNote(note);
                    setOverlayType(null);
                }}
            />
            <FolderOverlay
                title="Matching Game"
                isOpen={overlayType === 'matching'}
                onClose={() => setOverlayType(null)}
                items={flashcardNotes}
                onItemClick={(note) => {
                    setSelectedMatchingNote(note);
                    setOverlayType(null);
                }}
            />

            {/* Study Modals */}
            {
                selectedStudyNote && (
                    <StudyModal
                        isOpen={!!selectedStudyNote}
                        onClose={() => setSelectedStudyNote(null)}
                        noteId={selectedStudyNote.id}
                        noteContent={selectedStudyNote.content}
                    />
                )
            }

            {
                selectedTestNote && (
                    <TestModal
                        isOpen={!!selectedTestNote}
                        onClose={() => setSelectedTestNote(null)}
                        noteId={selectedTestNote.id}
                        noteContent={selectedTestNote.content}
                    />
                )
            }



            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ width: '100%', maxWidth: '600px' }}>
                            <div className={styles.panelHeader}>
                                <h3 className={styles.panelTitle}>AI Configuration</h3>
                                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowSettingsModal(false)} />
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <label className={styles.panelTitle} style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                    Primary Gemini API Key
                                </label>
                                <input
                                    type="password"
                                    className={styles.input}
                                    value={tempKeys[0]}
                                    onChange={(e) => {
                                        const newKeys = [...tempKeys];
                                        newKeys[0] = e.target.value;
                                        setTempKeys(newKeys);
                                    }}
                                    placeholder="Enter API Key"
                                />
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--color-primary)',
                                        fontSize: '0.75rem',
                                        marginTop: '0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        textDecoration: 'none',
                                        fontWeight: 600
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    Get your Gemini API key from Google AI Studio
                                    <Sparkles size={12} />
                                </a>


                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button className={styles.headerBtn} onClick={() => setShowSettingsModal(false)}>Cancel</button>
                                    <button className={styles.saveBtn} onClick={() => {
                                        const cleanKeys = tempKeys.filter(k => k.trim() !== '');
                                        setGeminiApiKeys(cleanKeys);
                                        setShowSettingsModal(false);
                                    }}>Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showPlanner && (
                    <>
                        <style>{`
                        @keyframes coolVanish {
                            0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                            100% { opacity: 0; transform: scale(0.96) translateY(20px); filter: blur(8px); }
                        }
                        @keyframes fadeOut {
                            from { opacity: 1; }
                            to { opacity: 0; }
                        }
                        .animate-vanish { animation: coolVanish 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                        .animate-fadeout { animation: fadeOut 0.5s ease forwards; }
                    `}</style>
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            padding: '4rem 1rem',
                            overflowY: 'auto'
                        }}
                            className={isPlannerClosing ? 'animate-fadeout' : ''}
                            onClick={handleClosePlanner}>
                            <div
                                className={isPlannerClosing ? 'animate-vanish' : 'animate-reveal'}
                                style={{
                                    width: '90%',
                                    maxHeight: '90vh',
                                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                    borderRadius: '24px',
                                    boxShadow: 'var(--shadow-2xl)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    padding: '1rem'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                    <MonthView />
                                </div>
                            </div>
                        </div>
                    </>
                )
            }

            {
                showTasks && (
                    <>
                        <style>{`
                        @keyframes coolVanish {
                            0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                            100% { opacity: 0; transform: scale(0.96) translateY(20px); filter: blur(8px); }
                        }
                        @keyframes fadeOut {
                            from { opacity: 1; }
                            to { opacity: 0; }
                        }
                        .animate-vanish { animation: coolVanish 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                        .animate-fadeout { animation: fadeOut 0.5s ease forwards; }
                    `}</style>
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            padding: '4rem 1rem',
                            overflowY: 'auto'
                        }}
                            className={isTasksClosing ? 'animate-fadeout' : ''}
                            onClick={handleCloseTasks}>
                            <div
                                className={isTasksClosing ? 'animate-vanish' : 'animate-reveal'}
                                style={{
                                    width: '98%',
                                    maxWidth: '1600px',
                                    maxHeight: '90vh',
                                    backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                    borderRadius: '24px',
                                    boxShadow: 'var(--shadow-2xl)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    padding: '1rem'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                    <DashboardOverview />
                                </div>
                            </div>
                        </div>
                    </>
                )
            }

            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={async () => {
                    if (auth.currentUser && noteToDelete) {
                        const { deleteNote } = useNoteStore.getState();
                        await deleteNote(auth.currentUser.uid, noteToDelete.id);
                        setNoteToDelete(null);
                    }
                }}
                title="Move to Trash"
                message="Are you sure you want to move this note to the trash? You can restore it later."
                confirmText="Move to Trash"
                isDangerous={false}
            />

            <MatchingModal
                isOpen={!!selectedMatchingNote}
                onClose={() => setSelectedMatchingNote(null)}
                noteId={selectedMatchingNote?.id || ''}
                noteContent={selectedMatchingNote?.content || ''}
            />

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setShowNewFolderModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '20px',
                            padding: '2rem',
                            width: '380px',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.6)',
                            animation: 'overlayPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}>
                                <Folder size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>New Folder</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Organize your notes</p>
                            </div>
                        </div>

                        <input
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newFolderName.trim()) {
                                    const user = auth.currentUser;
                                    if (user) await addFolder(user.uid, newFolderName.trim());
                                    setShowNewFolderModal(false);
                                }
                                if (e.key === 'Escape') setShowNewFolderModal(false);
                            }}
                            placeholder="Enter folder name..."
                            style={{
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                border: '2px solid var(--color-border)', outline: 'none',
                                fontSize: '0.95rem', background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-main)', transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                            <button
                                onClick={() => setShowNewFolderModal(false)}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px', border: '1px solid var(--color-border)',
                                    background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.85rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (newFolderName.trim()) {
                                        const user = auth.currentUser;
                                        if (user) await addFolder(user.uid, newFolderName.trim());
                                        setShowNewFolderModal(false);
                                    }
                                }}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                                    color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    opacity: newFolderName.trim() ? 1 : 0.5
                                }}
                                disabled={!newFolderName.trim()}
                            >
                                Create Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Right-Click Context Menu */}
            {folderContextMenu && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
                    onClick={() => setFolderContextMenu(null)}
                    onContextMenu={(e) => { e.preventDefault(); setFolderContextMenu(null); }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: folderContextMenu.y,
                            left: folderContextMenu.x,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(16px)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
                            padding: '4px',
                            minWidth: '160px',
                            animation: 'fadeIn 0.15s ease-out',
                            zIndex: 10000
                        }}
                    >
                        <button
                            onClick={() => {
                                setFolderToDelete(folderContextMenu.folder);
                                setFolderContextMenu(null);
                            }}
                            style={{
                                width: '100%', padding: '8px 14px', borderRadius: '8px',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '0.85rem', fontWeight: 600, color: '#ef4444',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={15} />
                            Delete Folder
                        </button>
                    </div>
                </div>
            )}

            {/* Note Right-Click Context Menu */}
            {noteContextMenu && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
                    onClick={() => setNoteContextMenu(null)}
                    onContextMenu={(e) => { e.preventDefault(); setNoteContextMenu(null); }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: noteContextMenu.y,
                            left: noteContextMenu.x,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(16px)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
                            padding: '4px',
                            minWidth: '170px',
                            animation: 'fadeIn 0.15s ease-out',
                            zIndex: 10000
                        }}
                    >
                        <button
                            onClick={() => {
                                setMovingNoteId(noteContextMenu.note.id);
                                setNoteContextMenu(null);
                            }}
                            style={{
                                width: '100%', padding: '8px 14px', borderRadius: '8px',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-main)',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Folder size={15} />
                            Move to Folder
                        </button>
                        <div style={{ height: '1px', background: 'var(--color-border)', margin: '2px 8px' }} />
                        <button
                            onClick={() => {
                                setNoteToDelete(noteContextMenu.note);
                                setNoteContextMenu(null);
                            }}
                            style={{
                                width: '100%', padding: '8px 14px', borderRadius: '8px',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '0.85rem', fontWeight: 600, color: '#ef4444',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={15} />
                            Delete Note
                        </button>
                    </div>
                </div>
            )}

            {/* Folder Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={async () => {
                    if (auth.currentUser && folderToDelete) {
                        await deleteFolder(auth.currentUser.uid, folderToDelete.id);
                        if (activeFolderId === folderToDelete.id) setActiveFolder(undefined);
                        setFolderToDelete(null);
                    }
                }}
                title="Delete Folder"
                message={`Are you sure you want to delete "${folderToDelete?.name}"? Notes inside will be moved to Uncategorized.`}
                confirmText="Delete"
                isDangerous={true}
            />
        </div >
    );
}

