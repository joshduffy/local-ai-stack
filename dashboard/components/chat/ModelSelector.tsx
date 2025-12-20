'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface OllamaModel {
  name: string;
  size: number;
}

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  loading,
  disabled,
}: ModelSelectorProps) {
  if (loading) {
    return <Skeleton className="h-10 w-48" />;
  }

  if (models.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No models available. Is Ollama running?
      </div>
    );
  }

  return (
    <Select value={selectedModel} onValueChange={onSelectModel} disabled={disabled}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.name} value={model.name}>
            <span className="flex items-center gap-2">
              {model.name}
              <span className="text-xs text-muted-foreground">
                ({formatSize(model.size)})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
