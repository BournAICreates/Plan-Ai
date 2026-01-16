
import Tesseract from 'tesseract.js';

export async function extractTextWithTesseract(imageBase64: string): Promise<string> {
    try {
        console.log("Starting Tesseract OCR...");
        const result = await Tesseract.recognize(
            imageBase64,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
                    }
                }
            }
        );
        return result.data.text;
    } catch (error) {
        console.error("Tesseract extraction failed:", error);
        throw new Error("Failed to extract text using Tesseract local OCR.");
    }
}
