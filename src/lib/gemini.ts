import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_FALLBACK_LIST = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-001",
    "gemini-1.5-flash-8b",
    "gemini-pro",
    "gemini-pro-vision"
];

async function tryGenerate(apiKey: string, prompt: string, modelName: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName
    });

    // Legacy support: gemini-pro doesn't support systemInstruction properly via config in all versions.
    // We prepend it to the prompt to be safe.
    const systemInstruction = "You are a professional writing assistant. You output ONLY the requested content for a note. Never include conversational filler, preambles, conclusions, or meta-commentary like 'Here is your plan' or 'Hope this helps'. Your output must be ready to be inserted directly into a document editor.";
    const finalPrompt = `${systemInstruction}\n\n${prompt}`;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    return response.text();
}

export async function generateContent(apiKeys: string[], prompt: string) {
    if (!apiKeys || apiKeys.length === 0) throw new Error("Gemini API Keys are missing.");

    // Explicit prompt constraint for generation
    const fullPrompt = `Task: Generate content based on this user prompt. Output ONLY the raw content.
    User Prompt: ${prompt}`;

    let lastError: any = null;

    for (const apiKey of apiKeys) {
        if (!apiKey) continue;
        try {
            for (const modelName of MODEL_FALLBACK_LIST) {
                try {
                    console.log(`Attempting AI generation with model: ${modelName} (Key ending in ...${apiKey.slice(-4)})`);
                    const text = await tryGenerate(apiKey, fullPrompt, modelName);
                    console.log(`Successfully used model: ${modelName}`);
                    return text;
                } catch (error) {
                    console.warn(`Gemini (${modelName}) failed with current key, trying next model...`, error);
                    lastError = error;
                }
            }
        } catch (keyError) {
            console.warn(`Key failed completely, trying next key...`);
        }
    }

    console.error("All Gemini models and keys failed:", lastError);
    throw lastError;
}

export async function enhanceContent(apiKeys: string[], content: string, instruction: string) {
    if (!apiKeys || apiKeys.length === 0) throw new Error("Gemini API Keys are missing.");

    // Explicit prompt constraint for enhancement
    const fullPrompt = `Task: Enhance the provided content based on the user instruction. Output ONLY the enhanced text.
    
    User Instruction: ${instruction}
    
    Original Content:
    ${content}`;

    let lastError: any = null;

    for (const apiKey of apiKeys) {
        if (!apiKey) continue;
        try {
            for (const modelName of MODEL_FALLBACK_LIST) {
                try {
                    console.log(`Attempting AI enhancement with model: ${modelName} (Key ending in ...${apiKey.slice(-4)})`);
                    const text = await tryGenerate(apiKey, fullPrompt, modelName);
                    console.log(`Successfully used model: ${modelName}`);
                    return text;
                } catch (error) {
                    console.warn(`Gemini-Enhance (${modelName}) failed, trying next model...`, error);
                    lastError = error;
                }
            }
        } catch (keyError) {
            console.warn(`Key failed completely, trying next key...`);
        }
    }

    console.error("All Gemini-Enhance models and keys failed:", lastError);
    throw lastError;
}

export async function summarizeTranscript(apiKeys: string[], transcript: string): Promise<string> {
    if (!apiKeys || apiKeys.length === 0) throw new Error("Gemini API Keys are missing.");

    const fullPrompt = `Task: Summarize the following YouTube video transcript. Create a concise, well-structured summary that captures the key points, main ideas, and important details. Use bullet points or paragraphs as appropriate. Output ONLY the summary.
    
    Transcript:
    ${transcript}`;

    let lastError: any = null;

    for (const apiKey of apiKeys) {
        if (!apiKey) continue;
        try {
            for (const modelName of MODEL_FALLBACK_LIST) {
                try {
                    console.log(`Attempting transcript summarization with model: ${modelName} (Key ending in ...${apiKey.slice(-4)})`);
                    const text = await tryGenerate(apiKey, fullPrompt, modelName);
                    console.log(`Successfully summarized with model: ${modelName}`);
                    return text;
                } catch (error) {
                    console.warn(`Gemini-Summarize (${modelName}) failed, trying next model...`, error);
                    lastError = error;
                }
            }
        } catch (keyError) {
            console.warn(`Key failed completely, trying next key...`);
        }
    }

    console.error("All Gemini-Summarize models and keys failed:", lastError);
    throw lastError;
}

export async function extractTextFromImage(apiKeys: string[], imageBase64: string, mimeType: string): Promise<string> {
    if (!apiKeys || apiKeys.length === 0) throw new Error("Gemini API Keys are missing.");

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: mimeType
        }
    };

    const prompt = "Extract all text from this image. Output ONLY the extracted text. If there is no text, describe the image briefly.";

    console.log('Using Image MIME type:', mimeType);

    let lastError: any = null;

    for (const apiKey of apiKeys) {
        if (!apiKey) continue;
        try {
            for (const modelName of MODEL_FALLBACK_LIST) {
                try {
                    console.log(`Attempting image text extraction with model: ${modelName} (Key ending in ...${apiKey.slice(-4)})`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const result = await model.generateContent([prompt, imagePart]);
                    const response = await result.response;
                    const text = response.text();

                    console.log(`Successfully extracted text with model: ${modelName}`);
                    return text;
                } catch (error: any) {
                    console.warn(`Gemini-Image (${modelName}) failed, trying next model...`, error);
                    lastError = error;
                    // If it was a rate limit error (429), wait a bit before trying next model
                    if (error.message && error.message.includes('429')) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        } catch (keyError) {
            console.warn(`Key failed completely, trying next key...`);
        }
    }

    console.error("All Gemini-Image models and keys failed:", lastError);
    throw lastError;
}
