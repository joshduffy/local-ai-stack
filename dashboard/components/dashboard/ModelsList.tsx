'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cpu } from 'lucide-react';

interface OllamaModel {
  name: string;
  size: number;
  details?: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function ModelsList() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/ollama/models');
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Installed Models
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No models installed. Run <code className="rounded bg-muted px-1">ollama pull llama3.2:3b</code>
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.details?.family && <span>{model.details.family} · </span>}
                      {model.details?.parameter_size && (
                        <span>{model.details.parameter_size} · </span>
                      )}
                      {model.details?.quantization_level && (
                        <span>{model.details.quantization_level}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{formatBytes(model.size)}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
