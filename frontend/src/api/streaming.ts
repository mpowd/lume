// src/api/streaming.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StreamCallbacks {
    onToken: (token: string) => void
    onComplete: (result: { response: string; contexts: string[]; source_urls: string[] }) => void
    onError: (error: Error) => void
    // Memory fields — forwarded straight to the backend
    session_id?: string
    memory_enabled?: boolean
}

export async function sendMessageStream(
    assistantId: string,
    message: string,
    callbacks: StreamCallbacks
) {
    const { onToken, onComplete, onError, session_id, memory_enabled } = callbacks

    try {
        const response = await fetch(
            `${API_BASE_URL}/assistants/${assistantId}/execute-stream`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    input_data: {
                        question: message,
                        ...(session_id !== undefined && { session_id }),
                        ...(memory_enabled !== undefined && { memory_enabled }),
                    },
                }),
            }
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullResponse = ''
        let contexts: string[] = []
        let sourceUrls: string[] = []

        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                onComplete({ response: fullResponse, contexts, source_urls: sourceUrls })
                break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6))

                        if (data.token) {
                            fullResponse += data.token
                            onToken(data.token)
                        } else if (data.contexts) {
                            contexts = data.contexts
                            sourceUrls = data.source_urls || []
                        }
                    } catch {
                        // Skip malformed SSE lines
                    }
                }
            }
        }
    } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)))
    }
}