import { useState, useCallback, useMemo } from 'react';

const API_BASE = '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const GENERAL_PROMPTS = [
  "What's the overall risk profile of my portfolio?",
  "How many policies are flagged as critical?",
  "Explain the XGBoost + SHAP methodology",
  "What IRDAI regulations apply to motor insurance?",
];

const POLICY_PROMPTS = [
  "Why is this policy's risk score high?",
  "What factors are driving the claim probability?",
  "Recommend a premium for this risk profile",
  "Compare this policy against portfolio averages",
];

export function useStreamingChat(policyId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestedPrompts = useMemo(
    () => (policyId ? POLICY_PROMPTS : GENERAL_PROMPTS),
    [policyId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = { role: 'user', content: content.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Build conversation history (exclude the current message)
      const historyMsg = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('insureiq_token') || ''}`,
          },
          body: JSON.stringify({
            message: content.trim(),
            history: historyMsg,
            policy_id: policyId || null,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: '🔒 Authentication required. Please log in again to use the AI assistant.',
              },
            ]);
            setIsLoading(false);
            return;
          }
          if (response.status === 429) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content:
                  "⏳ I'm currently rate-limited by the AI provider. Please wait 30-60 seconds and try again.",
              },
            ]);
            setIsLoading(false);
            return;
          }
          // Try to get error detail from response
          let errorDetail = `Request failed with status ${response.status}`;
          try {
            const errBody = await response.json();
            errorDetail = errBody.detail || errBody.message || errorDetail;
          } catch {
            // ignore parse errors
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `⚠️ ${errorDetail}`,
            },
          ]);
          setIsLoading(false);
          return;
        }

        // Add empty assistant message for streaming
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', isStreaming: true },
        ]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data || data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  // Handle error events from backend
                  if (parsed.error) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last && last.role === 'assistant') {
                        updated[updated.length - 1] = {
                          ...last,
                          content: `⚠️ ${parsed.error}`,
                          isStreaming: false,
                        };
                      }
                      return updated;
                    });
                    setIsLoading(false);
                    return;
                  }

                  // Handle done signal
                  if (parsed.done) continue;

                  // Extract token
                  const token = parsed.token || parsed.content || '';
                  if (token) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last && last.role === 'assistant') {
                        updated[updated.length - 1] = {
                          ...last,
                          content: last.content + token,
                          isStreaming: true,
                        };
                      }
                      return updated;
                    });
                  }
                } catch {
                  // Non-JSON data, skip
                }
              }
            }
          } catch (streamError) {
            // Stream was interrupted but we may have partial content
            console.warn('Stream interrupted:', streamError);
          }
        }

        // Mark streaming complete
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            // If we got no content at all, show an error
            if (!last.content.trim()) {
              updated[updated.length - 1] = {
                ...last,
                content: '⚠️ The AI response was empty. The backend may have encountered an error. Please try again.',
                isStreaming: false,
              };
            } else {
              updated[updated.length - 1] = { ...last, isStreaming: false };
            }
          }
          return updated;
        });
      } catch (error: any) {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Connection error: ${error.message || 'Unable to reach the AI service.'}. Please check that the backend is running and try again.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, policyId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    suggestedPrompts,
  };
}
