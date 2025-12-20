'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useChat';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Start a conversation</p>
          <p className="text-sm">Select a model and send a message</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <Avatar
              className={cn(
                'flex h-8 w-8 items-center justify-center',
                message.role === 'user' ? 'bg-primary' : 'bg-muted'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </Avatar>

            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <div className="whitespace-pre-wrap break-words text-sm">
                {message.content}
                {isStreaming &&
                  index === messages.length - 1 &&
                  message.role === 'assistant' && (
                    <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-current" />
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
