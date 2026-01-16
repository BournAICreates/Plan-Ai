import { useState, useRef } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import styles from './Notes.module.css';
import { useSettingsStore } from '../../store/useSettingsStore';
import { generateContent } from '../../lib/gemini';
import { useNoteStore } from '../../store/useNoteStore';
import { useAuth } from '../../contexts/AuthContext';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteContent: string;
    noteId?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pendingUpdate?: string; // HTML content proposed
}

export function ChatModal({ isOpen, onClose, noteContent, noteId }: ChatModalProps) {
    const { geminiApiKeys } = useSettingsStore();
    const { updateNote } = useNoteStore(); // Direct access to store
    const { user } = useAuth();

    // ... state ...
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Hello! I\'m your AI tutor. Ask me anything about this note.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ... useEffects ...

    const handleApplyUpdate = async (msgId: string, content: string) => {
        if (user && noteId) {
            await updateNote(user.uid, noteId, { content });

            // Remove the pending update button from the message to indicate applied state
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: m.content + "\n\n(Changes applied)", pendingUpdate: undefined } : m
            ));
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        if (!geminiApiKeys || geminiApiKeys.length === 0) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Before AI use please insert Api Keys"
            }]);
            return;
        }

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Contextual Prompt
            const context = `You are a helpful AI tutor assistant. 
            Answer the user's question primarily based on the following Note Content.
            
            IMPORTANT: You have the ability to EDIT the note if the user requests it (e.g., "shorten this", "make it bullet points", "rewrite this").
            If the user asks to modify the note, you must return the COMPLETE updated note content (in valid HTML format compatible with Tiptap/ProseMirror) wrapped in these specific tags:
            :::UPDATE_NOTE_START:::
            (your updated html content here)
            :::UPDATE_NOTE_END:::
            
            Do not include any conversational filler if you are updating the note. Just the wrapped content.
            If the user simply asks a question, answer normally without tags.

            Note Content (HTML):
            ${noteContent || "(Empty Note)"}`;

            const fullPrompt = `${context}\n\nUser Question: ${userMessage.content}`;

            const responseText = await generateContent(geminiApiKeys, fullPrompt);

            // Check for update tags
            const updateMatch = responseText.match(/:::UPDATE_NOTE_START:::([\s\S]*?):::UPDATE_NOTE_END:::/);

            if (updateMatch && updateMatch[1]) {
                const newContent = updateMatch[1].trim();

                if (user && noteId) {
                    await updateNote(user.uid, noteId, { content: newContent });
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: "I've updated the note content as requested."
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: "I generated the update, but couldn't apply it because the note ID is missing."
                    }]);
                }
            } else {
                // Normal response
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
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal} style={{ width: '500px', height: '600px', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className={styles.modalHeader} style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                    <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Bot size={24} className="text-primary" />
                        AI Tutor
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
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



                            <div
                                className={msg.role === 'assistant' ? styles.popIn : ''}
                                style={{
                                    maxWidth: '75%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                                    color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.5',
                                    boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', // Subtle shadow for pop effect
                                    transformOrigin: 'bottom left', // Animation origin
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
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
                                        <Bot size={14} />
                                        Apply to Note
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--color-bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} /></div>
                            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '12px', borderBottomLeftRadius: '2px' }}>
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-main)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', background: 'var(--color-bg-secondary)', padding: '0.5rem', borderRadius: '24px', border: '1px solid var(--color-border)' }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask a question..."
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                resize: 'none',
                                padding: '0.5rem 0.75rem',
                                height: '40px', // simplified auto-resize could be added
                                minHeight: '24px',
                                maxHeight: '100px',
                                outline: 'none',
                                color: 'var(--color-text-main)',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                padding: '0.5rem',
                                background: input.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                color: input.trim() ? 'white' : 'var(--color-text-muted)',
                                borderRadius: '50%',
                                transition: 'all 0.2s',
                                cursor: input.trim() ? 'pointer' : 'default'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>

            </div>
        </div >
    );
}
