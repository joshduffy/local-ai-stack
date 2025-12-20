'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { ImagePreview } from './ImagePreview';

interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  sampler: string;
}

const PRESETS = [
  { name: 'Landscape', prompt: 'a beautiful mountain landscape at sunset, photorealistic, 8k, detailed' },
  { name: 'Portrait', prompt: 'professional portrait photography, studio lighting, detailed face' },
  { name: 'Cyberpunk', prompt: 'cyberpunk city at night, neon lights, rain, futuristic, detailed' },
  { name: 'Fantasy', prompt: 'magical fantasy forest, ethereal lighting, mystical creatures' },
];

const SIZES = [
  { label: '1024 x 1024', width: 1024, height: 1024 },
  { label: '1152 x 896', width: 1152, height: 896 },
  { label: '896 x 1152', width: 896, height: 1152 },
  { label: '768 x 768', width: 768, height: 768 },
];

const SAMPLERS = ['euler', 'euler_ancestral', 'dpm_2', 'dpm_2_ancestral', 'dpmpp_2m', 'dpmpp_sde'];

export function ImageGenerator() {
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
    width: 1024,
    height: 1024,
    steps: 20,
    cfg: 7.5,
    sampler: 'euler',
  });
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!settings.prompt.trim()) return;

    setGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Queue the generation
      const queueRes = await fetch('/api/comfyui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!queueRes.ok) {
        const data = await queueRes.json();
        throw new Error(data.error || 'Failed to queue generation');
      }

      const { promptId, jobId } = await queueRes.json();

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusRes = await fetch(
          `/api/comfyui/status?promptId=${promptId}&jobId=${jobId}`
        );
        const status = await statusRes.json();

        if (status.status === 'complete' && status.images?.length > 0) {
          setGeneratedImage(status.images[0].url);
          break;
        }

        if (status.status === 'error') {
          throw new Error(status.error || 'Generation failed');
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Generation timed out');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setSettings((s) => ({ ...s, prompt: preset.prompt }));
  };

  const setSize = (value: string) => {
    const size = SIZES.find((s) => `${s.width}x${s.height}` === value);
    if (size) {
      setSettings((s) => ({ ...s, width: size.width, height: size.height }));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generate Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={settings.prompt}
              onChange={(e) => setSettings((s) => ({ ...s, prompt: e.target.value }))}
              placeholder="Describe the image you want to generate..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Negative Prompt</Label>
            <Textarea
              value={settings.negativePrompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, negativePrompt: e.target.value }))
              }
              placeholder="What to avoid..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={`${settings.width}x${settings.height}`}
                onValueChange={setSize}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem
                      key={`${size.width}x${size.height}`}
                      value={`${size.width}x${size.height}`}
                    >
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sampler</Label>
              <Select
                value={settings.sampler}
                onValueChange={(v) => setSettings((s) => ({ ...s, sampler: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLERS.map((sampler) => (
                    <SelectItem key={sampler} value={sampler}>
                      {sampler}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Steps: {settings.steps}</Label>
            <Slider
              value={[settings.steps]}
              onValueChange={([v]) => setSettings((s) => ({ ...s, steps: v }))}
              min={10}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Label>CFG Scale: {settings.cfg}</Label>
            <Slider
              value={[settings.cfg]}
              onValueChange={([v]) => setSettings((s) => ({ ...s, cfg: v }))}
              min={1}
              max={20}
              step={0.5}
            />
          </div>

          {error && (
            <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || !settings.prompt.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <ImagePreview
        imageUrl={generatedImage}
        generating={generating}
        settings={settings}
      />
    </div>
  );
}
