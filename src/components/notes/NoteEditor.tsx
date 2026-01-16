import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useEffect, useRef, useState } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';
import { useSettingsStore } from '../../store/useSettingsStore'; // Import settings
import { extractTextWithTesseract } from '../../lib/ocr'; // Import Tesseract OCR
import { extractTextFromImage } from '../../lib/gemini'; // Import AI enhancement
import { EditorToolbar } from './EditorToolbar';
import { FontSize } from '../../extensions/FontSize';
import styles from './Notes.module.css';
import { Image as ImageIcon, Loader2 } from 'lucide-react'; // Import icons

export function NoteEditor() {
    const { notes, activeNoteId, updateNote } = useNoteStore();
    const { user } = useAuth();
    const { geminiApiKeys } = useSettingsStore(); // Get API keys
    const activeNote = notes.find((n) => n.id === activeNoteId);
    const lastActiveNoteId = useRef<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null); // File input ref
    const [isExtracting, setIsExtracting] = useState(false); // Extracting state
    const [statusText, setStatusText] = useState(''); // Status text for loading

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            FontSize
        ],
        content: activeNote?.content || '',
        onUpdate: ({ editor }) => {
            if (activeNoteId && user) {
                updateNote(user.uid, activeNoteId, { content: editor.getHTML() });
            }
        },
        editorProps: {
            attributes: {
                class: styles.editorContent,
            },
        },
    });

    useEffect(() => {
        if (editor && activeNoteId !== lastActiveNoteId.current) {
            // Force set content only when switching notes
            editor.commands.setContent(activeNote?.content || '');
            lastActiveNoteId.current = activeNoteId;
        }
    }, [activeNoteId, editor, activeNote]);

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

    return (
        <div className={styles.editorContainer}>
            <EditorToolbar editor={editor} />
            <div className={styles.editorHeader} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1rem' }}>
                <input
                    className={styles.titleInput}
                    value={activeNote.title}
                    onChange={(e) => user && updateNote(user.uid, activeNote.id, { title: e.target.value })}
                    placeholder="Note Title"
                    style={{ flex: 1 }}
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
                    disabled={isExtracting}
                    className={styles.toolbarButton}
                    title="Upload image to extract text"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', cursor: isExtracting ? 'wait' : 'pointer', opacity: isExtracting ? 0.7 : 1 }}
                >
                    {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{isExtracting ? (statusText || 'Processing...') : 'Scan Image'}</span>
                </button>


            </div>
            <EditorContent editor={editor} className={styles.editorContent} />


        </div>
    );
}
