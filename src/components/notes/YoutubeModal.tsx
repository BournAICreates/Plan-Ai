import React, { useState } from 'react';
import { Youtube, X, Loader2, Link2, Key, Sparkles } from 'lucide-react';
import { extractVideoId, fetchYoutubeTranscript } from '../../lib/youtube';
import { summarizeTranscript } from '../../lib/gemini';
import { useSettingsStore } from '../../store/useSettingsStore';
import styles from './Notes.module.css';

interface YoutubeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (transcript: string) => void;
}

export function YoutubeModal({ isOpen, onClose, onSubmit }: YoutubeModalProps) {
    const { youtubeApiKey, setYoutubeApiKey, geminiApiKeys } = useSettingsStore();
    const [url, setUrl] = useState('');
    const [tempKey, setTempKey] = useState('');
    const [isSettingKey, setIsSettingKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingState, setLoadingState] = useState<'fetching' | 'summarizing' | null>(null);
    const [summarize, setSummarize] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasKey = !!youtubeApiKey;
    const hasGeminiKey = geminiApiKeys && geminiApiKeys.length > 0;

    if (!isOpen) return null;

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tempKey.trim()) {
            setYoutubeApiKey(tempKey.trim());
            setIsSettingKey(false);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!url.trim()) return;
        if (!youtubeApiKey) return;

        // Check if Gemini API key is needed for summarization
        if (summarize && !hasGeminiKey) {
            setError("Before AI use please insert Api Keys");
            return;
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            setError("Invalid YouTube URL. Please check the link and try again.");
            return;
        }

        setLoading(true);
        try {
            // Fetch transcript
            setLoadingState('fetching');
            const transcript = await fetchYoutubeTranscript(videoId, youtubeApiKey);

            let finalContent = transcript;

            // Summarize if enabled
            if (summarize && hasGeminiKey) {
                setLoadingState('summarizing');
                finalContent = await summarizeTranscript(geminiApiKeys, transcript);
            }

            onSubmit(finalContent);
            setUrl('');
            setSummarize(false);
            onClose();
        } catch (err: any) {
            console.error("Youtube Modal Error:", err);
            setError(err.message || "Failed to fetch transcript. Check your connectivity or API key.");
        } finally {
            setLoading(false);
            setLoadingState(null);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.aiModal}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        {isSettingKey || !hasKey ? <Key size={20} /> : <Youtube size={20} style={{ color: '#FF0000' }} />}
                        <span>{isSettingKey || !hasKey ? 'YouTube Setup' : 'YouTube Transcript'}</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {isSettingKey || !hasKey ? (
                    <form onSubmit={handleKeySubmit} className={styles.modalContent}>
                        <p className={styles.modalSubtitle}>
                            Enter your **Supadata.ai** API key to enable YouTube transcripts.
                            You can get a free key at <a href="https://supadata.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>supadata.ai</a>.
                        </p>
                        <input
                            type="password"
                            autoFocus
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            placeholder="Paste your Supadata API key here..."
                            className={styles.aiTextarea}
                            style={{ height: 'auto', marginBottom: '1rem' }}
                        />
                        <div className={styles.modalActions}>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button type="submit" disabled={!tempKey.trim()} className={styles.aiSubmitBtn}>
                                Save Key
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.modalContent}>
                        <p className={styles.modalSubtitle}>
                            Paste a YouTube link below to fetch its transcript and insert it into your note.
                        </p>

                        <div style={{ position: 'relative' }}>
                            <Link2
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-muted)',
                                    opacity: 0.5
                                }}
                            />
                            <input
                                type="text"
                                autoFocus
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className={styles.aiTextarea}
                                style={{
                                    height: 'auto',
                                    paddingLeft: '2.75rem',
                                    marginBottom: '0.5rem'
                                }}
                            />
                        </div>

                        {/* Summarization Toggle */}
                        <div className={styles.toggleContainer}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={summarize}
                                    onChange={(e) => setSummarize(e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                <Sparkles size={16} style={{ color: summarize ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                                <span className={styles.toggleText}>Summarize with Gemini</span>
                            </label>
                        </div>

                        {error && (
                            <p style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                                {error}
                            </p>
                        )}

                        <div className={styles.modalActions}>
                            <div style={{ marginRight: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingKey(true)}
                                    className={styles.cancelBtn}
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                >
                                    Change Key
                                </button>
                            </div>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !url.trim()}
                                className={styles.aiSubmitBtn}
                                style={{ background: '#FF0000', color: 'white' }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className={styles.spinner} />
                                        <span>{loadingState === 'summarizing' ? 'Summarizing...' : 'Fetching...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Youtube size={18} />
                                        <span>Fetch Transcript</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
