'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface OllamaModel {
  name: string;
  size: number;
}

export function ChatContainer() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(true);

  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat();

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch('/api/ollama/models');
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
          if (data.models?.length > 0) {
            setSelectedModel(data.models[0].name);
          }
        }
      } catch {
        // Ignore
      } finally {
        setLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  const handleSend = (content: string) => {
    if (selectedModel) {
      sendMessage(content, selectedModel);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          loading={loadingModels}
          disabled={isStreaming}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={clearMessages}
          disabled={messages.length === 0 || isStreaming}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <MessageList messages={messages} isStreaming={isStreaming} />
        <div className="border-t p-4">
          {error && (
            <div className="mb-2 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <MessageInput
            onSend={handleSend}
            disabled={!selectedModel || isStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </Card>
    </div>
  );
}
