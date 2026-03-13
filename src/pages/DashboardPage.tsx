import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import {
    Plus, ArrowRight, Paperclip,
    User, FileText, Layers, X, LogOut, Key, Folder,
    BookOpen, Clock, Layout as LayoutIcon, PenTool, Sparkles, Sun, Moon, Calendar, Trash2, Coffee, Youtube
} from 'lucide-react';
import { YoutubeModal } from '../components/notes/YoutubeModal';
import { auth } from '../lib/firebase';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { StudyModal } from '../components/notes/StudyModal';
import { TestModal } from '../components/notes/TestModal';

import { useTheme } from '../contexts/ThemeContext';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

import { MonthView } from '../components/calendar/MonthView';
import { DashboardOverview } from './DashboardOverview';
import { ActiveTasks } from '../components/dashboard/ActiveTasks';

import { MatchingModal } from '../components/notes/MatchingModal';
import { NoteEditor } from '../components/notes/NoteEditor';
import { chatWithTutor, chatWithTutorMultimodal } from '../lib/gemini';
import { Bot } from 'lucide-react';



function formatMarkdown(text: string): string {
    if (!text) return '';
    let html = text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:0.9rem;margin:0.75rem 0 0.25rem">$1</div>')
        .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:0.95rem;margin:0.75rem 0 0.25rem">$1</div>')
        .replace(/^\d+\.\s+(.+)$/gm, '<div style="padding-left:1rem;margin:0.35rem 0">• $1</div>')
        .replace(/^[-*]\s+(.+)$/gm, '<div style="padding-left:1rem;margin:0.35rem 0">• $1</div>')
        .replace(/\n\n/g, '<div style="height:0.6rem"></div>')
        .replace(/\n/g, '<br/>');
    return html;
}

/** 
 * Wraps words in animated spans for a smooth fade-in effect.
 * Only used for AI responses.
 */
function AnimateWords({ html }: { html: string }) {
    // We'll split by spaces but preserve tags
    // This is a simple approach: split text content while keeping HTML tags intact
    const parts = html.split(/(<[^>]*>|\s+)/);
    let delay = 0;

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('<')) {
                    return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
                }
                if (!part.trim()) {
                    return <span key={i}>{part}</span>;
                }

                // For actual text content, wrap each word (or group) in an animation
                delay += 0.03;
                return (
                    <span
                        key={i}
                        className={styles.aiWord}
                        style={{ animationDelay: `${delay}s` }}
                    >
                        {part}
                    </span>
                );
            })}
        </>
    );
}

import styles from '../components/dashboard/Dashboard.module.css';




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


/** Inline "Move to Folder" sub-menu inside the note right-click context menu */
function NoteContextMoveMenu({ note, folders, onMove }: {
    note: any;
    folders: { id: string; name: string }[];
    onMove: (folderId: string | undefined) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <style>{`
                @keyframes folderSlideIn {
                    from { opacity: 0; max-height: 0; transform: translateY(-6px); }
                    to   { opacity: 1; max-height: 400px; transform: translateY(0); }
                }
                .ncmm-list {
                    animation: folderSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    overflow: hidden;
                }
            `}</style>

            {/* Trigger row */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', padding: '9px 14px', borderRadius: '9px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-main)',
                    transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Folder size={15} />
                    Move to Folder
                </span>
                {/* Chevron rotates when open */}
                <span style={{
                    display: 'inline-block',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    opacity: 0.5,
                    fontSize: '0.7rem',
                    lineHeight: 1
                }}>▾</span>
            </button>

            {/* Animated folder list */}
            {open && (
                <div className="ncmm-list" style={{ paddingBottom: '4px' }}>
                    {/* Separator */}
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '2px 10px 4px' }} />

                    {/* Uncategorized option */}
                    <button
                        onClick={() => onMove(undefined)}
                        style={{
                            width: '100%', padding: '7px 14px 7px 24px',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '9px',
                            fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-muted)',
                            borderRadius: '8px', transition: 'background 0.12s',
                            opacity: !note.folderId ? 0.4 : 1,
                            pointerEvents: !note.folderId ? 'none' : 'auto'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Layers size={13} style={{ opacity: 0.6 }} />
                        Uncategorized
                    </button>

                    {/* Folder list */}
                    {folders.map(folder => {
                        const isCurrent = note.folderId === folder.id;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => !isCurrent && onMove(folder.id)}
                                style={{
                                    width: '100%', padding: '7px 14px 7px 24px',
                                    border: 'none', background: isCurrent ? 'var(--color-bg-subtle)' : 'transparent',
                                    cursor: isCurrent ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '9px',
                                    fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-main)',
                                    borderRadius: '8px', transition: 'background 0.12s',
                                    opacity: isCurrent ? 0.7 : 1,
                                }}
                                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
                                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Folder size={13} style={{ opacity: 0.7 }} />
                                {folder.name}
                                {isCurrent && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.6 }}>current</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
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

    const [noteToDelete, setNoteToDelete] = useState<any | null>(null);

    // New Folder Modal
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Folder Context Menu
    const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: any } | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<any | null>(null);

    // Note Context Menu
    const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; note: any } | null>(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameNoteTitle, setRenameNoteTitle] = useState('');
    const [noteToRename, setNoteToRename] = useState<any | null>(null);
    const [showYoutubeModal, setShowYoutubeModal] = useState(false);

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
        const trimmed = chatInput.trim();

        // ── Slash Command: /new ───────────────────────────────────────────
        if (/^\/new\s*$/i.test(trimmed)) {
            setChatInput('');
            const user = auth.currentUser;
            if (user) {
                addNote(user.uid, activeFolderId && activeFolderId !== 'all' ? activeFolderId : undefined);
            }
            return;
        }
        // ── Slash Command: /flashcards ──────────────────────────────────────
        if (/^\/flashcards?\s*$/i.test(trimmed)) {
            setChatInput('');
            setOverlayType('flashcards');
            return;
        }
        // ── Slash Command: /quiz ────────────────────────────────────────────
        if (/^\/quiz\s*$/i.test(trimmed)) {
            setChatInput('');
            setOverlayType('quiz');
            return;
        }
        // ── Slash Command: /matching ────────────────────────────────────────
        if (/^\/matching\s*$/i.test(trimmed)) {
            setChatInput('');
            setOverlayType('matching');
            return;
        }

        // ── Note Open Command ───────────────────────────────────────────────
        // Matches: "open [the] <name> [note]", "show [me] [the] <name>", "find <name>"
        const openNoteMatch = trimmed.match(
            /^(?:open(?:\s+(?:up|the))?|show(?:\s+me)?(?:\s+the)?|find|go\s+to(?:\s+the)?|switch\s+to(?:\s+the)?)\s+(.+?)(?:\s+note)?$/i
        );
        if (openNoteMatch) {
            const query = openNoteMatch[1].trim().toLowerCase();
            const livNotes = useNoteStore.getState().notes.filter(n => !n.deletedAt);

            // Priority: exact → starts-with → includes
            const exact = livNotes.find(n => n.title?.toLowerCase() === query);
            const startsWith = livNotes.find(n => n.title?.toLowerCase().startsWith(query));
            const includes = livNotes.find(n => n.title?.toLowerCase().includes(query));
            const found = exact || startsWith || includes;

            // Post the user message visually
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                content: trimmed
            }]);
            setChatInput('');

            if (found) {
                setActiveNote(found.id);
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `✅ Opened **"${found.title || 'Untitled'}"** in the note viewer.`
                }]);
            } else {
                const suggestions = livNotes
                    .filter(n => n.title)
                    .slice(0, 5)
                    .map(n => `• ${n.title}`)
                    .join('\n');
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `❌ Couldn't find a note matching **"${query}"**.${suggestions ? `\n\nAvailable notes:\n${suggestions}` : ' No notes found.'}`
                }]);
            }
            return;
        }

        // ── List All Notes Command ──────────────────────────────────────────
        // Matches: "what are my notes", "list my notes", "show all notes", "what notes do I have", etc.
        const listAllMatch = /^(?:what\s+are\s+(?:my\s+)?(?:all\s+)?|list\s+(?:all\s+)?(?:my\s+)?|show\s+(?:all\s+)?(?:my\s+)?|what\s+notes\s+do\s+I\s+have|do\s+I\s+have\s+any\s+)notes?$/i.test(trimmed);
        if (listAllMatch) {
            const { notes: allNotes, folders: allFolders } = useNoteStore.getState();
            const livNotes = allNotes.filter(n => !n.deletedAt);

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed }]);
            setChatInput('');

            if (livNotes.length === 0) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(), role: 'assistant',
                    content: "You don't have any notes yet. Click **+ New Note** in the left panel to create one!"
                }]);
            } else {
                // Group by folder
                const grouped: Record<string, string[]> = { Uncategorized: [] };
                allFolders.forEach(f => { grouped[f.name] = []; });
                livNotes.forEach(n => {
                    const folder = allFolders.find(f => f.id === n.folderId);
                    const key = folder ? folder.name : 'Uncategorized';
                    grouped[key]?.push(n.title || 'Untitled');
                });
                const lines = Object.entries(grouped)
                    .filter(([, notes]) => notes.length > 0)
                    .map(([folder, nts]) =>
                        `**${folder}** (${nts.length})\n${nts.map(t => `  • ${t}`).join('\n')}`
                    ).join('\n\n');
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(), role: 'assistant',
                    content: `You have **${livNotes.length} note${livNotes.length !== 1 ? 's' : ''}**:\n\n${lines}`
                }]);
            }
            return;
        }

        // ── List Notes In Folder Command ────────────────────────────────────
        // Matches: "what notes are in Biology", "list notes in the Math folder", "show me notes in Science"
        const listFolderMatch = trimmed.match(
            /^(?:what\s+notes\s+are\s+in|list\s+notes\s+in(?:\s+the)?|show\s+(?:me\s+)?notes\s+in(?:\s+the)?|notes\s+in(?:\s+the)?)\s+(.+?)(?:\s+folder)?$/i
        );
        if (listFolderMatch) {
            const folderQuery = listFolderMatch[1].trim().toLowerCase();
            const { notes: allNotes, folders: allFolders } = useNoteStore.getState();

            const folder = allFolders.find(f =>
                f.name.toLowerCase() === folderQuery ||
                f.name.toLowerCase().startsWith(folderQuery) ||
                f.name.toLowerCase().includes(folderQuery)
            );

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed }]);
            setChatInput('');

            if (!folder) {
                const folderNames = allFolders.map(f => `• ${f.name}`).join('\n');
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(), role: 'assistant',
                    content: `❌ Couldn't find a folder matching **"${folderQuery}"**.${folderNames ? `\n\nYour folders:\n${folderNames}` : ' No folders yet.'}`
                }]);
            } else {
                const folderNotes = allNotes.filter(n => !n.deletedAt && n.folderId === folder.id);
                if (folderNotes.length === 0) {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(), role: 'assistant',
                        content: `The **${folder.name}** folder is empty. Try adding some notes to it!`
                    }]);
                } else {
                    const noteList = folderNotes.map(n => `• ${n.title || 'Untitled'}`).join('\n');
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(), role: 'assistant',
                        content: `**${folder.name}** has **${folderNotes.length} note${folderNotes.length !== 1 ? 's' : ''}**:\n\n${noteList}`
                    }]);
                }
            }
            return;
        }

        const hasImages = attachedImages.length > 0;
        if (!trimmed && !hasImages) return;
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
            1. Research and answer questions.
            2. EDIT, FORMAT, and ORGANIZE the current note.

            STRICT FORMATTING RULES FOR NOTE UPDATES:
            - You MUST follow the user's formatting requests exactly (e.g., "bold this", "list that").
            - Use ONLY valid HTML tags inside the :::REPLACE_NOTE::: or :::INSERT_CONTENT::: blocks. 
            - DO NOT use markdown shorthand like **bold** or - bullets inside these blocks. Use <strong> and <ul><li> instead.
            - Ensure high-quality HTML output:
                - Bold: <strong>key text</strong>
                - Bullet Points: <ul><li>item</li></ul>
                - Numbered Lists: <ol><li>step</li></ol>
                - Headings: <h2>Topic</h2>
                - Spacing: Use <p> or <br/>.
            - If the user says "bold key terms", strictly wrap them in <strong> tags.
            - If requested to "convert to a list", use the proper <ul> or <ol> tags.

            RESPONSE STYLE:
            - Be concise in your chat response.
            - Focus on delivering high-quality, perfectly formatted note updates.
            
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

    // Show all non-deleted notes for Quizzes (so users can create new tests), and for Flashcards
    const quizNotes = notes.filter(n => !n.deletedAt);
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
                        <img src="/logo.svg" alt="Plan.ai Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

                {/* ── CENTER PANEL: AI Chat ── */}
                <section className={styles.centerPanel} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>


                    {/* Chat message history */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '1rem',
                        display: 'flex', flexDirection: 'column', gap: '1rem',
                        margin: '0 0 0.75rem',
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
                                                <div style={{ lineHeight: 1.7 }}>
                                                    <AnimateWords html={formatMarkdown(msg.content)} />
                                                </div>
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
                                    <div className={styles.coffeeLoader}>
                                        <div className={styles.coffeeIconBox}>
                                            <div className={styles.coffeeSteam}>♨</div>
                                            <div className={styles.coffeeCup}>
                                                <Coffee size={32} />
                                                <div className={styles.coffeeLiquid}></div>
                                            </div>
                                        </div>
                                        <div className={styles.coffeeText}>
                                            Brewing response<span className={styles.coffeeGlow}>...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Attached Image Previews */}
                    {attachedImages.length > 0 && (
                        <div style={{
                            margin: '0 1.25rem', padding: '0.5rem 0.75rem',
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
                    {/* Slash Command Autocomplete */}
                    {chatInput.startsWith('/') && (() => {
                        const q = chatInput.slice(1).toLowerCase();
                        const SLASH_COMMANDS: { cmd: string; label: string; desc: string; icon: string; action?: () => void; overlay?: 'quiz' | 'flashcards' | 'matching' }[] = [
                            {
                                cmd: 'new', label: 'New Note', desc: 'Create a fresh note', icon: '📝', action: () => {
                                    const user = auth.currentUser;
                                    if (user) addNote(user.uid, activeFolderId && activeFolderId !== 'all' ? activeFolderId : undefined);
                                }
                            },
                            { cmd: 'flashcards', label: 'Flashcards', desc: 'Open flashcard study set', icon: '🃏', overlay: 'flashcards' },
                            { cmd: 'quiz', label: 'Quiz', desc: 'Open practice quiz', icon: '❓', overlay: 'quiz' },
                            { cmd: 'matching', label: 'Matching', desc: 'Open matching game', icon: '🧩', overlay: 'matching' },
                        ];
                        const matches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(q));
                        if (matches.length === 0) return null;
                        return (
                            <div style={{
                                margin: '0 1.25rem 0',
                                background: 'var(--color-bg-surface)',
                                border: '1.5px solid var(--color-primary)',
                                borderBottom: 'none',
                                borderRadius: '14px 14px 0 0',
                                padding: '6px 6px 4px',
                                boxShadow: '0 -6px 24px rgba(99,102,241,0.13)',
                                animation: 'slashIn 0.15s cubic-bezier(0.16,1,0.3,1)',
                            }}>
                                <style>{`
                                    @keyframes slashIn {
                                        from { opacity: 0; transform: translateY(8px); }
                                        to   { opacity: 1; transform: translateY(0); }
                                    }
                                `}</style>
                                <div style={{ padding: '0 6px 4px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                    Commands
                                </div>
                                {matches.map(c => (
                                    <button
                                        key={c.cmd}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setChatInput('');
                                            if (c.action) c.action();
                                            if (c.overlay) setOverlayType(c.overlay);
                                        }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '7px 10px', borderRadius: '9px', border: 'none',
                                            background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                            marginBottom: '2px', transition: 'background 0.12s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span style={{ fontSize: '1.05rem', width: '22px', textAlign: 'center', flexShrink: 0 }}>{c.icon}</span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>/{c.cmd}</span>
                                        <span style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>— {c.desc}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {/* AI Chat Input */}
                    <div style={{
                        margin: '0 1.25rem 1.25rem', flexShrink: 0,
                        border: '1.5px solid #cbd5e1',
                        borderRadius: (chatInput.startsWith('/') || attachedImages.length > 0) ? '0 0 16px 16px' : '16px',
                        padding: '0.5rem 0.5rem 0.5rem 1rem',
                        background: '#ffffff',
                        boxShadow: '0 0 0 0.5px #cbd5e1, 0 2px 12px rgba(0,0,0,0.04)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderWidth = '1px';
                            e.currentTarget.style.borderColor = '#000000';
                            e.currentTarget.style.boxShadow = '0 0 0 0.5px #000000, 0 4px 15px rgba(0, 0, 0, 0.05)';
                            const input = e.currentTarget.querySelector('input');
                            if (input) input.style.fontWeight = '400';
                        }}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                e.currentTarget.style.borderWidth = '1.5px';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.boxShadow = '0 0 0 0.5px #cbd5e1, 0 2px 12px rgba(0,0,0,0.04)';
                                const input = e.currentTarget.querySelector('input');
                                if (input) input.style.fontWeight = '500';
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
                                fontFamily: 'inherit', fontWeight: '500'
                            }}
                            placeholder="Ask anything… or type / for commands"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendChat();
                                if (e.key === 'Escape') setChatInput('');
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


                {/* ── RIGHT PANEL: Note Viewer (Editable) ── */}
                <aside className={styles.sidePanel}>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {(() => {
                            const activeNote = notes.find(n => n.id === activeNoteId);
                            if (!activeNote) {
                                return (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '18px',
                                            background: 'var(--color-bg-subtle)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <BookOpen size={24} style={{ opacity: 0.35 }} />
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>No Note Open</h3>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                                            Select or create a note<br />from the left panel
                                        </p>
                                    </div>
                                );
                            }
                            return (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem' }}>
                                    {/* Local override for minimal editor text size/spacing */}
                                    <style>{`
                                        .minimal-note-view .ProseMirror {
                                            font-size: 0.76rem !important;
                                            line-height: 1.6 !important;
                                            max-width: 100% !important;
                                            margin: 0 !important;
                                            padding: 0 !important;
                                        }
                                        .minimal-note-view .ProseMirror p {
                                            margin-bottom: 0.75em !important;
                                        }
                                        .minimal-note-view .ProseMirror h1 { font-size: 1.2rem !important; margin-top: 1rem !important; }
                                        .minimal-note-view .ProseMirror h2 { font-size: 1.1rem !important; margin-top: 0.8rem !important; }
                                        .minimal-note-view .ProseMirror h3 { font-size: 1rem !important; margin-top: 0.6rem !important; }
                                    `}</style>

                                    {/* Note header row */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '8px',
                                                background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', flexShrink: 0
                                            }}>
                                                <BookOpen size={14} />
                                            </div>
                                            <span style={{
                                                fontSize: '0.85rem', fontWeight: 700,
                                                color: 'var(--color-text-main)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                maxWidth: '160px'
                                            }}>
                                                {activeNote.title || 'Untitled Note'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => setShowYoutubeModal(true)}
                                                style={{
                                                    background: 'rgba(255, 0, 0, 0.05)',
                                                    border: '1px solid rgba(255, 0, 0, 0.15)',
                                                    borderRadius: '50%', width: '28px', height: '28px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: '#FF0000', flexShrink: 0,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)'}
                                                title="Summarize YouTube Video"
                                            >
                                                <Youtube size={14} />
                                            </button>
                                            <button
                                                onClick={() => setActiveNote(undefined)}
                                                style={{
                                                    background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
                                                    borderRadius: '50%', width: '28px', height: '28px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Note content box - Editable */}
                                    <div style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        background: 'var(--color-bg-subtle)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '14px',
                                        padding: '0.85rem 1rem',
                                        fontSize: '0.76rem',
                                        lineHeight: 1.6,
                                        color: 'var(--color-text-main)',
                                        boxShadow: 'var(--shadow-sm)',
                                    }} className="minimal-note-view">
                                        <NoteEditor variant="minimal" />
                                    </div>
                                </div>
                            );
                        })()}
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

            <YoutubeModal
                isOpen={showYoutubeModal}
                onClose={() => setShowYoutubeModal(false)}
                onSubmit={async (content) => {
                    const user = auth.currentUser;
                    if (!user || !activeNoteId) return;
                    const activeNote = notes.find(n => n.id === activeNoteId);
                    if (!activeNote) return;
                    const newContent = activeNote.content + content;
                    await updateNote(user.uid, activeNoteId, { content: newContent });
                }}
            />

            {/* Study Modals */}
            {selectedStudyNote && (
                <StudyModal
                    isOpen={!!selectedStudyNote}
                    onClose={() => setSelectedStudyNote(null)}
                    noteId={selectedStudyNote.id}
                    noteContent={selectedStudyNote.content}
                />
            )}

            {selectedTestNote && (
                <TestModal
                    isOpen={!!selectedTestNote}
                    onClose={() => setSelectedTestNote(null)}
                    noteId={selectedTestNote.id}
                    noteContent={selectedTestNote.content}
                />
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
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
                                    const cleanKeys = tempKeys.filter((k: string) => k.trim() !== '');
                                    setGeminiApiKeys(cleanKeys);
                                    setShowSettingsModal(false);
                                }}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Planner Modal */}
            {showPlanner && (
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
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'center', padding: '4rem 1rem', overflowY: 'auto'
                    }}
                        className={isPlannerClosing ? 'animate-fadeout' : ''}
                        onClick={handleClosePlanner}
                    >
                        <div
                            className={isPlannerClosing ? 'animate-vanish' : 'animate-reveal'}
                            style={{
                                width: '90%', maxHeight: '90vh',
                                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                borderRadius: '24px', boxShadow: 'var(--shadow-2xl)',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                position: 'relative', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '1rem'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                <MonthView />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Tasks Modal */}
            {showTasks && (
                <>
                    <style>{`
                        @keyframes coolVanish2 {
                            0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                            100% { opacity: 0; transform: scale(0.96) translateY(20px); filter: blur(8px); }
                        }
                        @keyframes fadeOut2 {
                            from { opacity: 1; }
                            to { opacity: 0; }
                        }
                        .animate-vanish2 { animation: coolVanish2 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                        .animate-fadeout2 { animation: fadeOut2 0.5s ease forwards; }
                    `}</style>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'center', padding: '4rem 1rem', overflowY: 'auto'
                    }}
                        className={isTasksClosing ? 'animate-fadeout2' : ''}
                        onClick={handleCloseTasks}
                    >
                        <div
                            className={isTasksClosing ? 'animate-vanish2' : 'animate-reveal'}
                            style={{
                                width: '98%', maxWidth: '1600px', maxHeight: '90vh',
                                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                                borderRadius: '24px', boxShadow: 'var(--shadow-2xl)',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                position: 'relative', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '1rem'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                <DashboardOverview />
                            </div>
                        </div>
                    </div>
                </>
            )}

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

            {/* Rename Note Modal */}
            {showRenameModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}
                    onClick={() => setShowRenameModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '20px',
                            padding: '2rem',
                            width: '380px',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                            animation: 'overlayPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Rename Note</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Update the title of your note</p>
                            </div>
                        </div>

                        <input
                            autoFocus
                            value={renameNoteTitle}
                            onChange={(e) => setRenameNoteTitle(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && renameNoteTitle.trim() && noteToRename) {
                                    const user = auth.currentUser;
                                    if (user) await updateNote(user.uid, noteToRename.id, { title: renameNoteTitle.trim() });
                                    setShowRenameModal(false);
                                }
                                if (e.key === 'Escape') setShowRenameModal(false);
                            }}
                            placeholder="Enter new title..."
                            style={{
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                border: '2px solid var(--color-border)', outline: 'none',
                                fontSize: '0.95rem', background: 'var(--color-bg-subtle)',
                                color: 'var(--color-text-main)', boxSizing: 'border-box'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                            <button
                                onClick={() => setShowRenameModal(false)}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px', border: '1px solid var(--color-border)',
                                    background: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (renameNoteTitle.trim() && noteToRename) {
                                        const user = auth.currentUser;
                                        if (user) await updateNote(user.uid, noteToRename.id, { title: renameNoteTitle.trim() });
                                        setShowRenameModal(false);
                                    }
                                }}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white', cursor: 'pointer', fontWeight: 700
                                }}
                            >
                                Rename
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
                <>
                    <style>{`
                        @keyframes folderSlideDown {
                            from { opacity: 0; max-height: 0; transform: translateY(-4px); }
                            to   { opacity: 1; max-height: 400px; transform: translateY(0); }
                        }
                        .folder-submenu-open {
                            animation: folderSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                            overflow: hidden;
                        }
                    `}</style>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
                        onClick={() => { setNoteContextMenu(null); }}
                        onContextMenu={(e) => { e.preventDefault(); setNoteContextMenu(null); }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'fixed',
                                top: noteContextMenu.y,
                                left: noteContextMenu.x,
                                background: 'rgba(255, 255, 255, 0.97)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: '14px',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
                                padding: '5px',
                                minWidth: '200px',
                                animation: 'fadeIn 0.15s ease-out',
                                zIndex: 10000
                            }}
                        >
                            <button
                                onClick={() => {
                                    setNoteToRename(noteContextMenu.note);
                                    setRenameNoteTitle(noteContextMenu.note.title || '');
                                    setShowRenameModal(true);
                                    setNoteContextMenu(null);
                                }}
                                style={{
                                    width: '100%', padding: '9px 14px', borderRadius: '9px',
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-main)',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <PenTool size={15} />
                                Rename Note
                            </button>
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '3px 8px' }} />
                            <NoteContextMoveMenu
                                note={noteContextMenu.note}
                                folders={folders}
                                onMove={(folderId) => {
                                    const user = auth.currentUser;
                                    if (user) updateNote(user.uid, noteContextMenu.note.id, { folderId });
                                    setNoteContextMenu(null);
                                }}
                            />
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '3px 8px' }} />
                            <button
                                onClick={() => {
                                    setNoteToDelete(noteContextMenu.note);
                                    setNoteContextMenu(null);
                                }}
                                style={{
                                    width: '100%', padding: '9px 14px', borderRadius: '9px',
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
                </>
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
        </div>
    );
}

