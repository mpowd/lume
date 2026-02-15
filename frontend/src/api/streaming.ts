// src/api/streaming.ts
//
// SSE streaming for chat. This is the only hand-written API code —
// everything else comes from Orval-generated hooks.
//
// SSE (Server-Sent Events) can't be code-generated because it's not
// a standard request/response pattern — the server sends data
// continuously as a stream of chunks.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StreamCallbacks {
    onToken: (token: string) => void
    onComplete: (result: { response: string; contexts: string[]; source_urls: string[] }) => void
    onError: (error: Error) => void
}

/**
 * Send a message to an assistant and stream the response token by token.
 *
 * Uses the /assistants/{id}/execute-stream endpoint which returns
 * Server-Sent Events (SSE) — each event contains either a token
 * or metadata (contexts, source URLs).
 */
export async function sendMessageStream(
    assistantId: string,
    message: string,
    callbacks: StreamCallbacks
) {
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
                    input_data: { question: message },
                }),
            }
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullResponse = ''
        let contexts = []
        let sourceUrls = []

        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                callbacks.onComplete({
                    response: fullResponse,
                    contexts,
                    source_urls: sourceUrls,
                })
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
                            callbacks.onToken(data.token)
                        } else if (data.contexts) {
                            contexts = data.contexts
                            sourceUrls = data.source_urls || []
                        }
                    } catch (e) {
                        // Skip malformed SSE lines
                    }
                }
            }
        }
    } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
}
