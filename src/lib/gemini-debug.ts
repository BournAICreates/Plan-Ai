
export async function listAvailableModels(apiKeys: string[]): Promise<string> {
    if (!apiKeys || apiKeys.length === 0) {
        return "No API Key provided.";
    }
    const apiKey = apiKeys[0]; // Just use first key for debug listing

    try {
        console.log("Debugging: Listing available models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            return `ListModels failed: ${response.status} ${response.statusText}`;
        }

        const data = await response.json();
        if (data && data.models) {
            const names = data.models.map((m: any) => m.name.replace('models/', ''));
            console.log("Model Names:", names);
            return names.join(', ');
        }
        return "No models found in response.";
    } catch (error: any) {
        console.error("Error listing models:", error);
        return `Error listing models: ${error.message}`;
    }
}
