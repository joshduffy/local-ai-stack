'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu, HardDrive, Server, Image, MessageSquare, Activity } from 'lucide-react';

interface SystemStatus {
  services: {
    ollama: { healthy: boolean; port: number; modelCount: number };
    comfyui: { healthy: boolean; port: number };
  };
  system: {
    platform: string;
    arch: string;
    cpus: number;
    memory: { total: number; used: number; free: number; percentUsed: number };
    uptime: number;
  };
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function StatusCards() {
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
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load system status
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ollama</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={status.services.ollama.healthy ? 'default' : 'destructive'}>
              {status.services.ollama.healthy ? 'Online' : 'Offline'}
            </Badge>
            {status.services.ollama.healthy && (
              <span className="text-sm text-muted-foreground">
                {status.services.ollama.modelCount} models
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Port {status.services.ollama.port}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">ComfyUI</CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Badge variant={status.services.comfyui.healthy ? 'default' : 'destructive'}>
            {status.services.comfyui.healthy ? 'Online' : 'Offline'}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            Port {status.services.comfyui.port}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Memory</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status.system.memory.percentUsed}%</div>
          <Progress value={status.system.memory.percentUsed} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBytes(status.system.memory.used)} / {formatBytes(status.system.memory.total)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">System</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{status.system.cpus} cores</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {status.system.platform} {status.system.arch}
          </p>
          <p className="text-xs text-muted-foreground">
            Uptime: {formatUptime(status.system.uptime)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
