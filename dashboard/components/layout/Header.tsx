'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemStatus {
  services: {
    ollama: { healthy: boolean; modelCount: number };
    comfyui: { healthy: boolean };
  };
  system: {
    memory: { percentUsed: number };
  };
}

export function Header() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Local AI Stack</h1>
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          <>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </>
        ) : status ? (
          <>
            <Badge variant={status.services.ollama.healthy ? 'default' : 'destructive'}>
              Ollama {status.services.ollama.healthy ? `(${status.services.ollama.modelCount})` : 'offline'}
            </Badge>
            <Badge variant={status.services.comfyui.healthy ? 'default' : 'destructive'}>
              ComfyUI {status.services.comfyui.healthy ? 'online' : 'offline'}
            </Badge>
            <Badge variant="outline">RAM: {status.system.memory.percentUsed}%</Badge>
          </>
        ) : (
          <Badge variant="destructive">Services unavailable</Badge>
        )}
      </div>
    </header>
  );
}
