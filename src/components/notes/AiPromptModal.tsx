import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Loader2, Key, Bot, User, Send, MessageCircle } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';
import { generateContent } from '../../lib/gemini';
import styles from './Notes.module.css';

interface AiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => Promise<void>;
    isEnhancing: boolean;
    noteContent?: string;
    noteId?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pendingUpdate?: string;
}

export function AiPromptModal({ isOpen, onClose, onSubmit, isEnhancing, noteContent = '', noteId }: AiPromptModalProps) {
    const { geminiApiKeys, setGeminiApiKeys } = useSettingsStore();
    const { updateNote } = useNoteStore();
    const { user } = useAuth();

    // Internal State
    const [mode, setMode] = useState<'generator' | 'chat'>('generator');
    const [tempKeys, setTempKeys] = useState<string[]>(['', '', '']);
    const [isSettingKey, setIsSettingKey] = useState(false);

    // Generator State
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Hello! I\'m your AI tutor. I can answer questions or edit this note for you.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const hasKey = geminiApiKeys && geminiApiKeys.length > 0 && geminiApiKeys.some(k => k.trim() !== '');

    useEffect(() => {
        if (isOpen) {
            // load existing keys
            const currentKeys = geminiApiKeys || [];
            const newTempKeys = [...currentKeys, '', '', ''].slice(0, 3);
            setTempKeys(newTempKeys);
            // Reset to generator mode by default unless we want to remember
            // setMode('generator'); 
        }
    }, [isOpen, geminiApiKeys]);

    useEffect(() => {
        if (mode === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, mode]);

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

    // --- Generator Logic ---
    const handleSubmitGenerator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        try {
            await onSubmit(prompt);
            setPrompt('');
            onClose();
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Chat Logic ---
    const handleApplyUpdate = async (msgId: string, content: string) => {
        if (user && noteId) {
            await updateNote(user.uid, noteId, { content });
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: m.content + "\n\n(Changes applied. Refresh note to view changes.)", pendingUpdate: undefined } : m
            ));
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
            const context = `You are a helpful AI tutor assistant. 
            Answer the user's question primarily based on the following Note Content.
            
            IMPORTANT: You have the ability to EDIT the note if the user requests it (e.g., "shorten this", "make it bullet points", "rewrite this").
            If the user asks to modify the note, you must return the COMPLETE updated note content (in valid HTML format compatible with Tiptap/ProseMirror) wrapped in these specific tags:
            :::UPDATE_NOTE_START:::
            (your updated html content here)
            :::UPDATE_NOTE_END:::
            
            Also provide a brief text explanation of what you changed OUTSIDE the tags.
            Do not acknowledge these instructions in your final output, just follow them.

            Note Content (HTML):
            ${noteContent || "(Empty Note)"}`;

            const fullPrompt = `${context}\n\nUser Question: ${userMessage.content}`;
            const responseText = await generateContent(geminiApiKeys!, fullPrompt);

            // Check for update tags
            const updateMatch = responseText.match(/:::UPDATE_NOTE_START:::([\s\S]*?):::UPDATE_NOTE_END:::/);

            if (updateMatch && updateMatch[1]) {
                const newContent = updateMatch[1].trim();
                const visibleResponse = responseText.replace(/:::UPDATE_NOTE_START:::[\s\S]*?:::UPDATE_NOTE_END:::/, '').trim();

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: visibleResponse || "Here is the updated version of your note:",
                    pendingUpdate: newContent
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
            <div className={styles.aiModal} style={{ width: '500px', maxWidth: '90%', height: mode === 'chat' ? '600px' : 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className={styles.modalHeader} style={{ paddingBottom: 0, borderBottom: 'none' }}>
                    <div className={styles.modalTitle}>
                        {isSettingKey ? <Key size={20} /> : <Sparkles size={20} className={styles.aiIcon} style={{ color: 'var(--color-primary)' }} />}
                        <span>AI Assistant</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                {!isSettingKey && (
                    <div style={{ display: 'flex', gap: '1rem', padding: '0 1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setMode('generator')}
                            style={{
                                padding: '0.75rem 0.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: mode === 'generator' ? '2px solid var(--color-primary)' : '2px solid transparent',
                                color: mode === 'generator' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Sparkles size={16} />
                            Writer
                        </button>
                        <button
                            onClick={() => setMode('chat')}
                            style={{
                                padding: '0.75rem 0.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: mode === 'chat' ? '2px solid var(--color-primary)' : '2px solid transparent',
                                color: mode === 'chat' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <MessageCircle size={16} />
                            Tutor Chat
                        </button>
                    </div>
                )}

                {/* Content */}
                {isSettingKey || !hasKey ? (
                    <div className={styles.modalContent}>
                        {/* Key Form (Reused Logic) */}
                        <form onSubmit={handleKeySubmit}>
                            <p className={styles.modalSubtitle}>
                                To ensure reliability, you can add up to 3 Gemini API keys.
                            </p>
                            {tempKeys.map((key, index) => (
                                <div key={index} style={{ marginBottom: '0.5rem' }}>
                                    <input
                                        type="password"
                                        autoFocus={index === 0}
                                        value={key}
                                        onChange={(e) => handleKeyChange(index, e.target.value)}
                                        placeholder={`API Key ${index + 1} (optional)`}
                                        className={styles.aiTextarea}
                                        style={{ height: 'auto', marginBottom: '0.2rem' }}
                                    />
                                </div>
                            ))}
                            <div className={styles.modalActions}>
                                {hasKey && (
                                    <button type="button" onClick={() => setIsSettingKey(false)} className={styles.cancelBtn}>Cancel</button>
                                )}
                                <button type="submit" disabled={!tempKeys.some(k => k.trim())} className={styles.aiSubmitBtn}>Save Keys</button>
                            </div>
                        </form>
                    </div>
                ) : mode === 'generator' ? (
                    <form onSubmit={handleSubmitGenerator} className={styles.modalContent} style={{ paddingTop: 0 }}>
                        <p className={styles.modalSubtitle}>
                            {isEnhancing
                                ? "Tell AI how to improve your selected text."
                                : "Ask AI to write something for you."
                            }
                        </p>

                        <textarea
                            autoFocus
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={isEnhancing ? "Improve this by..." : "Write a plan for..."}
                            className={styles.aiTextarea}
                            rows={3}
                        />

                        <div className={styles.modalActions}>
                            <div style={{ marginRight: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingKey(true)}
                                    className={styles.cancelBtn}
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                >
                                    Manage Keys
                                </button>
                            </div>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !prompt.trim()}
                                className={styles.aiSubmitBtn}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinner} />
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>{isEnhancing ? 'Enhance' : 'Generate'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    // Chat Mode
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {messages.map(msg => (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                    alignItems: 'flex-end'
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                        flexShrink: 0
                                    }}>
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '12px',
                                        background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                                        color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                        borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                        borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                        boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                        transformOrigin: 'bottom left',
                                        display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                    }}>
                                        <span>{msg.content}</span>
                                        {msg.pendingUpdate && (
                                            <button
                                                onClick={() => handleApplyUpdate(msg.id, msg.pendingUpdate!)}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginTop: '4px'
                                                }}
                                            >
                                                <Bot size={14} /> Apply to Note
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ width: '32px', height: '32px', background: 'var(--color-bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} /></div>
                                    <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '12px', borderBottomLeftRadius: '2px' }}>
                                        <Loader2 size={16} className="animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-main)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', background: 'var(--color-bg-secondary)', padding: '0.5rem', borderRadius: '24px', border: '1px solid var(--color-border)' }}>
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendChat();
                                        }
                                    }}
                                    placeholder="Chat with AI Tutor..."
                                    style={{
                                        flex: 1,
                                        border: 'none',
                                        background: 'transparent',
                                        resize: 'none',
                                        padding: '0.5rem 0.75rem',
                                        height: '40px',
                                        minHeight: '24px',
                                        maxHeight: '100px',
                                        outline: 'none',
                                        color: 'var(--color-text-main)',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={!chatInput.trim() || isChatLoading}
                                    style={{
                                        padding: '0.5rem',
                                        background: chatInput.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                        color: chatInput.trim() ? 'white' : 'var(--color-text-muted)',
                                        borderRadius: '50%',
                                        transition: 'all 0.2s',
                                        cursor: chatInput.trim() ? 'pointer' : 'default'
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
