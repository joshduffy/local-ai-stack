const COMFYUI_URL = 'http://127.0.0.1:8188';

export interface WorkflowSettings {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  checkpoint?: string;
}

export interface QueueResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

export interface HistoryItem {
  prompt: unknown;
  outputs: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
  status: {
    status_str: string;
    completed: boolean;
    messages: Array<[string, unknown]>;
  };
}

export interface SystemStats {
  system: {
    os: string;
    python_version: string;
    embedded_python: boolean;
  };
  devices: Array<{
    name: string;
    type: string;
    vram_total: number;
    vram_free: number;
  }>;
}

// Check if ComfyUI is running
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${COMFYUI_URL}/system_stats`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get system stats
export async function getSystemStats(): Promise<SystemStats | null> {
  try {
    const response = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// Build SDXL workflow
export function buildSDXLWorkflow(settings: WorkflowSettings): Record<string, unknown> {
  const seed = settings.seed ?? Math.floor(Date.now() * Math.random()) % (2 ** 32);
  const checkpoint = settings.checkpoint ?? 'sd_xl_base_1.0.safetensors';

  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['1', 1], text: settings.prompt },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['1', 1], text: settings.negativePrompt ?? 'blurry, low quality, distorted' },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: settings.width ?? 1024,
        height: settings.height ?? 1024,
        batch_size: 1,
      },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
        seed: seed,
        steps: settings.steps ?? 20,
        cfg: settings.cfg ?? 7.5,
        sampler_name: settings.sampler ?? 'euler',
        scheduler: settings.scheduler ?? 'normal',
        denoise: 1,
      },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: { samples: ['5', 0], vae: ['1', 2] },
    },
    '7': {
      class_type: 'SaveImage',
      inputs: { images: ['6', 0], filename_prefix: 'dashboard' },
    },
  };
}

// Queue a workflow for execution
export async function queuePrompt(workflow: Record<string, unknown>): Promise<QueueResponse> {
  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to queue prompt: ${error}`);
  }

  return response.json();
}

// Generate an image with SDXL
export async function generateImage(settings: WorkflowSettings): Promise<QueueResponse> {
  const workflow = buildSDXLWorkflow(settings);
  return queuePrompt(workflow);
}

// Get execution history for a prompt
export async function getHistory(promptId: string): Promise<Record<string, HistoryItem>> {
  const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  if (!response.ok) {
    throw new Error('Failed to get history');
  }
  return response.json();
}

// Check if a prompt has completed and get the output
export async function checkCompletion(
  promptId: string
): Promise<{ completed: boolean; images?: string[]; error?: string }> {
  try {
    const history = await getHistory(promptId);

    if (!(promptId in history)) {
      return { completed: false };
    }

    const item = history[promptId];
    const images: string[] = [];

    // Find all output images
    for (const output of Object.values(item.outputs)) {
      if (output.images) {
        for (const image of output.images) {
          images.push(image.filename);
        }
      }
    }

    if (images.length > 0) {
      return { completed: true, images };
    }

    // Check for errors
    if (item.status.status_str === 'error') {
      return { completed: true, error: 'Generation failed' };
    }

    return { completed: false };
  } catch (error) {
    return { completed: false, error: String(error) };
  }
}

// Get the URL for an output image
export function getImageUrl(filename: string): string {
  return `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}`;
}

// Get queue status
export async function getQueueStatus(): Promise<{ pending: number; running: number }> {
  try {
    const response = await fetch(`${COMFYUI_URL}/queue`);
    if (!response.ok) return { pending: 0, running: 0 };
    const data = await response.json();
    return {
      pending: data.queue_pending?.length ?? 0,
      running: data.queue_running?.length ?? 0,
    };
  } catch {
    return { pending: 0, running: 0 };
  }
}

// Interrupt current generation
export async function interrupt(): Promise<void> {
  await fetch(`${COMFYUI_URL}/interrupt`, { method: 'POST' });
}

// List available checkpoints
export async function listCheckpoints(): Promise<string[]> {
  try {
    const response = await fetch(`${COMFYUI_URL}/object_info/CheckpointLoaderSimple`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
  } catch {
    return [];
  }
}
