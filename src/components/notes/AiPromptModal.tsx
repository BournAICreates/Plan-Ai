import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Key, Bot, User, Send, Check } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';
import { chatWithTutor } from '../../lib/gemini';
import styles from './Notes.module.css';

interface AiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string) => Promise<void>;
    isEnhancing: boolean;
    noteContent?: string;
    noteId?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pendingUpdate?: string;
    updateType?: 'replace' | 'insert';
}

export function AiPromptModal({ isOpen, onClose, onSubmit, isEnhancing, noteContent = '', noteId }: AiPromptModalProps) {
    const { geminiApiKeys, setGeminiApiKeys } = useSettingsStore();
    const { updateNote } = useNoteStore();
    const { user } = useAuth();

    // Internal State
    const [tempKeys, setTempKeys] = useState<string[]>(['', '', '']);
    const [isSettingKey, setIsSettingKey] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Hello! I\'m your unified AI assistant. I can help you write, organize, or format this note. How can I help today?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const hasKey = geminiApiKeys && geminiApiKeys.length > 0 && geminiApiKeys.some(k => k.trim() !== '');

    useEffect(() => {
        if (isOpen) {
            const currentKeys = geminiApiKeys || [];
            const newTempKeys = [...currentKeys, '', '', ''].slice(0, 3);
            setTempKeys(newTempKeys);
        }
    }, [isOpen, geminiApiKeys]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen) return null;

    // --- Key Management ---
    const handleKeyChange = (index: number, value: string) => {
        const newKeys = [...tempKeys];
        newKeys[index] = value;
        setTempKeys(newKeys);
    };

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validKeys = tempKeys.map(k => k.trim()).filter(k => k !== '');
        if (validKeys.length > 0) {
            setGeminiApiKeys(validKeys);
            setIsSettingKey(false);
        }
    };

    // --- Unified AI Logic ---
    const handleApplyUpdate = async (msgId: string, content: string, type: 'replace' | 'insert') => {
        try {
            if (type === 'replace' && user && noteId) {
                await updateNote(user.uid, noteId, { content });
            } else if (type === 'insert') {
                await onSubmit(content);
            }

            setMessages(prev => prev.map(m =>
                m.id === msgId ? {
                    ...m,
                    content: m.content + `\n\n(Changes ${type === 'replace' ? 'applied' : 'inserted'} successfully!)`,
                    pendingUpdate: undefined
                } : m
            ));
        } catch (err) {
            console.error(err);
            alert("Failed to apply changes.");
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;

        if (!hasKey) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Before AI use please insert Api Keys in the settings tab."
            }]);
            return;
        }

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: chatInput };
        setMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const systemContext = `You are a powerful AI Assistant and Expert Document Organizer. 
            You can write new content, rewrite existing content, and organize notes into professional structures.

            CURRENT NOTE CONTENT (HTML):
            ${noteContent || "(Empty Note)"}

            ${isEnhancing ? "The user has text selected in the editor and likely wants you to improve or expand on it." : ""}

            CAPABILITIES & FORMATTING:
            1. **ORGANIZING**: If asked to organize, format, or restructure, return the ENTIRE updated note content. Use HTML tags (<h2>, <ul>, <li>, <strong>, etc.).
            2. **WRITING/ADDING**: If asked to write a new section or add content, you can either provide it as an insertion or a replacement.
            3. **FORMATTING**: Apply professional styling as requested (e.g., "Make this a list", "Add headers").

            RETURN FORMAT:
            - If you are providing a FULL REPLACEMENT of the note (for organizing or heavy editing), wrap the HTML in:
              :::REPLACE_NOTE_START:::
              (updated html content)
              :::REPLACE_NOTE_END:::
            - If you are providing NEW CONTENT to be inserted at the cursor, wrap the HTML in:
              :::INSERT_CONTENT_START:::
              (html to insert)
              :::INSERT_CONTENT_END:::

            Always explain your changes outside the tags. Be concise.`;

            const responseText = await chatWithTutor(geminiApiKeys!, systemContext, userMessage.content);

            // Detection Logic
            const replaceMatch = responseText.match(/:::REPLACE_NOTE_START:::([\s\S]*?):::REPLACE_NOTE_END:::/);
            const insertMatch = responseText.match(/:::INSERT_CONTENT_START:::([\s\S]*?):::INSERT_CONTENT_END:::/);

            let visibleResponse = responseText
                .replace(/:::REPLACE_NOTE_START:::[\s\S]*?:::REPLACE_NOTE_END:::/, '')
                .replace(/:::INSERT_CONTENT_START:::[\s\S]*?:::INSERT_CONTENT_END:::/, '')
                .trim();

            if (replaceMatch) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: visibleResponse || "I've restructured your note. Review it and click below to apply:",
                    pendingUpdate: replaceMatch[1].trim(),
                    updateType: 'replace'
                }]);
            } else if (insertMatch) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: visibleResponse || "Here is the content I generated for you:",
                    pendingUpdate: insertMatch[1].trim(),
                    updateType: 'insert'
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: responseText
                }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I encountered an error. Please check your API Key or try again."
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal} style={{ width: '550px', maxWidth: '95%', height: '700px', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className={styles.modalHeader} style={{ background: 'var(--color-bg-subtle)' }}>
                    <div className={styles.modalTitle}>
                        <Sparkles size={20} className={styles.aiIcon} style={{ color: 'var(--color-primary)' }} />
                        <span>AI Assistant</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setIsSettingKey(!isSettingKey)}
                            className={styles.closeBtn}
                            title="Manage API Keys"
                        >
                            <Key size={18} />
                        </button>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {isSettingKey || !hasKey ? (
                        <div className={styles.modalContent} style={{ padding: '2rem' }}>
                            <form onSubmit={handleKeySubmit}>
                                <h3 style={{ marginBottom: '1rem' }}>AI Configuration</h3>
                                <p className={styles.modalSubtitle} style={{ marginBottom: '1.5rem' }}>
                                    Insert your Gemini API keys to power the assistant. You can add up to 3 for better reliability.
                                </p>
                                {tempKeys.map((key, index) => (
                                    <div key={index} style={{ marginBottom: '1rem' }}>
                                        <input
                                            type="password"
                                            autoFocus={index === 0}
                                            value={key}
                                            onChange={(e) => handleKeyChange(index, e.target.value)}
                                            placeholder={`API Key ${index + 1}`}
                                            className={styles.aiTextarea}
                                            style={{ height: 'auto' }}
                                        />
                                    </div>
                                ))}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--color-primary)',
                                        fontSize: '0.8rem',
                                        marginTop: '-0.5rem',
                                        marginBottom: '1rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        textDecoration: 'none',
                                        fontWeight: 600
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    Get your API keys from Google AI Studio
                                    <Sparkles size={12} />
                                </a>

                                <div className={styles.modalActions} style={{ marginTop: '2rem' }}>
                                    {hasKey && (
                                        <button type="button" onClick={() => setIsSettingKey(false)} className={styles.cancelBtn}>Back to Chat</button>
                                    )}
                                    <button type="submit" disabled={!tempKeys.some(k => k.trim())} className={styles.aiSubmitBtn}>
                                        Save & Continue
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // Unified Chat
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{
                                        display: 'flex',
                                        gap: '0.75rem',
                                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                        alignItems: 'flex-start'
                                    }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                            flexShrink: 0,
                                            marginTop: '4px'
                                        }}>
                                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                        </div>
                                        <div style={{
                                            maxWidth: '85%',
                                            padding: '1rem',
                                            borderRadius: '16px',
                                            background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                                            color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                            borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                                            borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.6',
                                            boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {msg.content}

                                            {msg.pendingUpdate && (
                                                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem' }}>
                                                    <button
                                                        onClick={() => handleApplyUpdate(msg.id, msg.pendingUpdate!, msg.updateType!)}
                                                        className={styles.aiSubmitBtn}
                                                        style={{
                                                            width: '100%',
                                                            justifyContent: 'center',
                                                            background: msg.role === 'user' ? 'white' : 'var(--color-primary)',
                                                            color: msg.role === 'user' ? 'var(--color-primary)' : 'white'
                                                        }}
                                                    >
                                                        {msg.updateType === 'replace' ? (
                                                            <><Check size={16} /> Update Note Content</>
                                                        ) : (
                                                            <><Sparkles size={16} /> Insert into Note</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ width: '36px', height: '36px', background: 'var(--color-bg-tertiary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} /></div>
                                        <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem 1rem', borderRadius: '16px', borderTopLeftRadius: '4px' }}>
                                            <div className={styles.loadingDots}>
                                                <span></span><span></span><span></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div style={{ padding: '1.5rem', background: 'var(--color-bg-main)', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'flex-end',
                                    background: 'var(--color-bg-subtle)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1.5rem',
                                    border: '1px solid var(--color-border)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendChat();
                                            }
                                        }}
                                        placeholder="Ask AI to write, organize, or format..."
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            background: 'transparent',
                                            resize: 'none',
                                            padding: '0',
                                            height: '24px',
                                            minHeight: '24px',
                                            maxHeight: '150px',
                                            outline: 'none',
                                            color: 'var(--color-text-main)',
                                            fontFamily: 'inherit',
                                            fontSize: '0.95rem'
                                        }}
                                        disabled={isChatLoading}
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        disabled={!chatInput.trim() || isChatLoading}
                                        style={{
                                            padding: '0.5rem',
                                            background: chatInput.trim() ? 'var(--color-primary)' : 'transparent',
                                            color: chatInput.trim() ? 'white' : 'var(--color-text-muted)',
                                            borderRadius: '50%',
                                            transition: 'all 0.2s',
                                            cursor: chatInput.trim() ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                                    AI can edit and organize your note. Try "Organize this into a plan" or "Make this a list".
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
