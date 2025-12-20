import { NextResponse } from 'next/server';
import * as ollama from '@/lib/ollama';
import * as comfyui from '@/lib/comfyui';
import os from 'os';

export async function GET() {
  const [ollamaHealthy, comfyuiHealthy, comfyuiStats, ollamaModels] = await Promise.all([
    ollama.checkHealth(),
    comfyui.checkHealth(),
    comfyui.getSystemStats(),
    ollama.listModels().catch(() => []),
  ]);

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return NextResponse.json({
    services: {
      ollama: {
        healthy: ollamaHealthy,
        port: 11434,
        modelCount: ollamaModels.length,
      },
      comfyui: {
        healthy: comfyuiHealthy,
        port: 8188,
        stats: comfyuiStats,
      },
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentUsed: Math.round((usedMemory / totalMemory) * 100),
      },
      uptime: os.uptime(),
    },
  });
}
