/**
 * Utility for extracting YouTube Video IDs and fetching transcripts.
 */

/**
 * Extracts the video ID from various YouTube URL formats.
 */
export function extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * Fetches the transcript for a given YouTube video.
 * We use the Supadata API as it provides a clean, CORS-friendly endpoint for transcripts.
 * Note: In a production app, you might want to use your own backend proxy.
 */
export async function fetchYoutubeTranscript(videoId: string, apiKey: string): Promise<string> {
    try {
        // Using supadata.ai public endpoint for demonstration
        // Note: For heavy use, an API key or a dedicated proxy would be needed.
        const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        // Check if the response contains an error
        if (data.error || data.message) {
            const errorMessage = data.message || data.error || 'Unknown error from API';
            const details = data.details ? `\n\nDetails: ${data.details}` : '';

            if (response.status === 401 || response.status === 403) {
                throw new Error(`Invalid or missing API key. ${errorMessage}${details}`);
            }

            throw new Error(`API Error: ${errorMessage}${details}`);
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch transcript (Status: ${response.status})`);
        }

        // Helper to extract text from various possible formats
        const extractText = (val: any): string | null => {
            if (typeof val === 'string' && val.length > 0) return val;
            if (Array.isArray(val)) {
                return val
                    .map(item => (typeof item === 'string' ? item : item?.text || item?.content || ''))
                    .filter(Boolean)
                    .join(' ');
            }
            if (val && typeof val === 'object') {
                return val.text || val.content || null;
            }
            return null;
        };

        // Try known keys in priority order
        const transcript = extractText(data.transcript) ||
            extractText(data.content) ||
            extractText(data.text) ||
            extractText(data.data);

        if (transcript && transcript.length > 50) {
            return transcript;
        }

        // Hail Mary: Search for any long string in the top level
        for (const key of Object.keys(data)) {
            const val = data[key];
            if (typeof val === 'string' && val.length > 500) return val;
        }

        const availableKeys = Object.keys(data).join(', ');
        console.error('Full API response:', data);
        throw new Error(`Transcript format unexpected. Received keys: ${availableKeys}. The API may have changed its response format.`);
    } catch (error) {
        console.error("YouTube Fetch Error details:", error);
        throw error;
    }
}
