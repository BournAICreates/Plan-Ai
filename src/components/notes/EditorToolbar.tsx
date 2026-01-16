import { Editor } from '@tiptap/react';
import {
    Bold, Italic, Strikethrough,
    List, ListOrdered, Quote, Undo, Redo,
    ChevronDown, Sparkles, Youtube, GraduationCap
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNoteStore } from '../../store/useNoteStore'; // Added import
import { AiPromptModal } from './AiPromptModal';
import { YoutubeModal } from './YoutubeModal';
import { StudyModal } from './StudyModal'; // Added import
import { generateContent, enhanceContent } from '../../lib/gemini';
import styles from './Notes.module.css';

interface EditorToolbarProps {
    editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const { geminiApiKeys } = useSettingsStore();
    const { activeNoteId, notes } = useNoteStore(); // Added hook
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
    const [isStudyModalOpen, setIsStudyModalOpen] = useState(false); // Added state
    const menuRef = useRef<HTMLDivElement>(null);

    const isTextSelected = editor?.state.selection.empty === false;
    const activeNote = notes.find(n => n.id === activeNoteId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAiSubmit = async (prompt: string) => {
        if (!editor || !geminiApiKeys || geminiApiKeys.length === 0) return;

        if (isTextSelected) {
            const selectedText = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to
            );
            const enhanced = await enhanceContent(geminiApiKeys, selectedText, prompt);
            editor.chain().focus().insertContent(enhanced).run();
        } else {
            const generated = await generateContent(geminiApiKeys, prompt);
            editor.chain().focus().insertContent(generated).run();
        }
    };

    const handleYoutubeSubmit = (transcript: string) => {
        if (!editor) return;

        // Insert with a nice header
        editor.chain().focus()
            .insertContent(`<h3>Video Transcript</h3>`)
            .insertContent(`<p>${transcript}</p>`)
            .run();
    };

    if (!editor) {
        return null;
    }

    return (
        <div className={styles.toolbar}>
            {/* ... Font Size and Format Buttons ... */}
            <div className={styles.toolbarGroup}>
                <div className={styles.sizeCombobox} ref={menuRef}>
                    <input
                        type="number"
                        className={styles.sizeInput}
                        value={parseInt(editor.getAttributes('textStyle').fontSize || '16')}
                        onChange={(e) => {
                            const size = e.target.value;
                            if (size) {
                                editor.chain().focus().setFontSize(`${size}px`).run();
                            }
                        }}
                        min="6"
                        max="100"
                        title="Font Size"
                    />
                    <div
                        className={styles.sizeChevron}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <ChevronDown size={14} />
                    </div>

                    {isMenuOpen && (
                        <div className={styles.presetsMenu}>
                            {[6, 12, 24, 36, 48, 60, 72, 84].map((size) => (
                                <div
                                    key={size}
                                    className={styles.presetItem}
                                    onClick={() => {
                                        editor.chain().focus().setFontSize(`${size}px`).run();
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    {size}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className={styles.divider} />
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.isActive : ''}`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.isActive : ''}`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('strike') ? styles.isActive : ''}`}
                    title="Strikethrough"
                >
                    <Strikethrough size={18} />
                </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.isActive : ''}`}
                    title="Bullet List"
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('orderedList') ? styles.isActive : ''}`}
                    title="Ordered List"
                >
                    <ListOrdered size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`${styles.toolbarBtn} ${editor.isActive('blockquote') ? styles.isActive : ''}`}
                    title="Quote"
                >
                    <Quote size={18} />
                </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => setIsAiModalOpen(true)}
                    className={`${styles.toolbarBtn} ${styles.aiBtn}`}
                    title={isTextSelected ? "Enhance Selection with AI" : "Ask AI to Write"}
                >
                    <Sparkles size={18} />
                </button>
                <button
                    onClick={() => setIsStudyModalOpen(true)}
                    className={`${styles.toolbarBtn} ${styles.aiBtn}`}
                    title="Study Flashcards"
                    style={{ color: 'var(--color-primary)' }}
                >
                    <GraduationCap size={18} />
                </button>
                <button
                    onClick={() => setIsYoutubeModalOpen(true)}
                    className={`${styles.toolbarBtn} ${styles.youtubeBtn}`}
                    title="Fetch YouTube Transcript"
                >
                    <Youtube size={18} />
                </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.toolbarGroup}>
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className={styles.toolbarBtn}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className={styles.toolbarBtn}
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo size={18} />
                </button>
            </div>

            <AiPromptModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onSubmit={handleAiSubmit}
                isEnhancing={isTextSelected}
                noteId={activeNoteId || ''}
                noteContent={activeNote?.content || ''}
            />

            <StudyModal
                isOpen={isStudyModalOpen}
                onClose={() => setIsStudyModalOpen(false)}
                noteId={activeNoteId || ''}
                noteContent={activeNote?.content || ''}
            />

            <YoutubeModal
                isOpen={isYoutubeModalOpen}
                onClose={() => setIsYoutubeModalOpen(false)}
                onSubmit={handleYoutubeSubmit}
            />
        </div>
    );
}
