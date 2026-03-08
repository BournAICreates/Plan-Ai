import { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';
import { useSettingsStore } from '../../store/useSettingsStore'; // Import settings
import { extractTextWithTesseract } from '../../lib/ocr'; // Import Tesseract OCR
import { extractTextFromImage } from '../../lib/gemini'; // Import AI enhancement
import { EditorToolbar } from './EditorToolbar';
import { FontSize } from '../../extensions/FontSize';
import styles from './Notes.module.css';
import { Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react'; // Import icons

interface NoteEditorProps {
    variant?: 'default' | 'minimal';
}

export function NoteEditor({ variant = 'default' }: NoteEditorProps) {
    const { notes, activeNoteId, updateNote, restoreNote } = useNoteStore();
    const { user } = useAuth();
    const { geminiApiKeys } = useSettingsStore(); // Get API keys
    const activeNote = notes.find((n) => n.id === activeNoteId);
    const lastActiveNoteId = useRef<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null); // File input ref
    const [isExtracting, setIsExtracting] = useState(false); // Extracting state
    const [statusText, setStatusText] = useState(''); // Status text for loading
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSystemUpdate = useRef(false);
    const lastSavedContent = useRef<string>(activeNote?.content || '');

    const isTrash = !!activeNote?.deletedAt;

    // Helper for comparing HTML content (ignores minor whitespace differences)
    const isEquivalent = (html1: string, html2: string) => {
        if (html1 === html2) return true;
        const normalize = (html: string) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
        return normalize(html1) === normalize(html2);
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            FontSize
        ],
        content: activeNote?.content || '',
        editable: !isTrash,
        onUpdate: ({ editor }) => {
            if (isSystemUpdate.current) return;

            if (activeNoteId && user && !isTrash && editor.isFocused) {
                const newContent = editor.getHTML();

                if (isEquivalent(newContent, lastSavedContent.current) || isEquivalent(newContent, activeNote?.content || '')) {
                    return;
                }

                console.log("[Editor] Scheduling save...", { length: newContent.length });

                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                    console.log("[Editor] Performing save to Firestore.");
                    lastSavedContent.current = newContent;
                    updateNote(user.uid, activeNoteId, { content: newContent });
                }, 1000);
            }
        },
        editorProps: {
            attributes: {
                class: styles.editorContent,
            },
        },
    });

    useEffect(() => {
        if (editor) {
            const isNoteSwitch = activeNoteId !== lastActiveNoteId.current;
            const storeContent = activeNote?.content || '';
            const editorContent = editor.getHTML();

            const isRemoteChange = !isEquivalent(storeContent, lastSavedContent.current);
            const isDifferentFromEditor = !isEquivalent(storeContent, editorContent);

            // Sync if:
            // 1. We switched notes
            // 2. The store changed externally (isRemoteChange) AND it's different from what we see
            // 3. We are not focused and it's different
            const shouldSync = isNoteSwitch || (isRemoteChange && isDifferentFromEditor) || (isDifferentFromEditor && !editor.isFocused);

            if (shouldSync) {
                console.log("[Editor] Syncing from store", { reason: isNoteSwitch ? 'switch' : (isRemoteChange ? 'remote' : 'idle') });

                if (saveTimeoutRef.current) {
                    console.log("[Editor] Cancelling pending save due to sync.");
                    clearTimeout(saveTimeoutRef.current);
                }

                isSystemUpdate.current = true;
                editor.commands.setContent(storeContent);
                lastSavedContent.current = storeContent;

                setTimeout(() => {
                    isSystemUpdate.current = false;
                }, 200);

                lastActiveNoteId.current = activeNoteId;
            }
            editor.setEditable(!isTrash);
        }
    }, [activeNoteId, editor, activeNote?.content, isTrash]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setIsExtracting(true);
        setStatusText('Processing...');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64String = reader.result as string;
                let finalText = '';

                // Priority: Use Gemini Vision (Direct Image-to-Text)
                if (geminiApiKeys && geminiApiKeys.length > 0) {
                    setStatusText('Analyzing Image with AI...');
                    try {
                        const extracted = await extractTextFromImage(geminiApiKeys, base64String, file.type);
                        finalText = extracted;
                    } catch (aiError) {
                        console.warn("Gemini Vision failed, falling back to local OCR:", aiError);
                        setStatusText('AI Failed, using Local OCR...');
                        try {
                            // Fallback to Tesseract
                            finalText = await extractTextWithTesseract(base64String);
                        } catch (ocrError) {
                            console.error("Local OCR also failed:", ocrError);
                            alert("Failed to extract text from image.");
                        }
                    }
                } else {
                    // No API Key: Use Tesseract (Local)
                    setStatusText('Extracting Text (Local)...');
                    try {
                        finalText = await extractTextWithTesseract(base64String);
                    } catch (ocrError) {
                        console.error("Local OCR failed:", ocrError);
                        alert("Failed to extract text from image.");
                    }
                }

                if (editor && finalText) {
                    editor.chain().focus().insertContent(`\n${finalText}`).run();
                }
                setIsExtracting(false);
                setStatusText('');
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                setIsExtracting(false);
                setStatusText('');
                alert("Failed to read the image file.");
            };
        } catch (error) {
            console.error("Failed to process image:", error);
            setIsExtracting(false);
            setStatusText('');
            alert("Failed to process image.");
        } finally {
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (!activeNote) {
        return (
            <div className={styles.editorContainer}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-faint)' }}>
                    Select or create a note to start writing
                </div>
            </div>
        );
    }

    const isMinimal = variant === 'minimal';

    return (
        <div className={styles.editorContainer} style={isMinimal ? { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } : {}}>
            {isTrash && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trash2 size={16} />
                        Note is in Trash
                    </span>
                    <button
                        onClick={() => user && restoreNote(user.uid, activeNote.id)}
                        className={styles.buttonSecondary}
                        style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <RefreshCw size={14} />
                        Restore
                    </button>
                </div>
            )}
            {!isTrash && !isMinimal && <EditorToolbar editor={editor} />}
            {!isMinimal && (
                <div className={styles.editorHeader} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1rem' }}>
                    <input
                        className={styles.titleInput}
                        value={activeNote.title}
                        onChange={(e) => user && updateNote(user.uid, activeNote.id, { title: e.target.value })}
                        placeholder="Note Title"
                        style={{ flex: 1 }}
                        disabled={isTrash}
                    />

                    {/* Image Upload Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExtracting || isTrash}
                        className={styles.toolbarButton}
                        title="Upload image to extract text"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', cursor: (isExtracting || isTrash) ? 'default' : 'pointer', opacity: (isExtracting || isTrash) ? 0.7 : 1 }}
                    >
                        {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{isExtracting ? (statusText || 'Processing...') : 'Scan Image'}</span>
                    </button>
                </div>
            )}
            <EditorContent
                editor={editor}
                className={styles.editorContent}
                style={isMinimal ? { padding: 0, fontSize: 'inherit', lineHeight: 'inherit' } : {}}
            />
        </div>
    );
}
