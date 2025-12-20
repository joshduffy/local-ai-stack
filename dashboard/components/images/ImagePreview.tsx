'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string | null;
  generating: boolean;
  settings?: {
    prompt: string;
    width: number;
    height: number;
    steps: number;
    cfg: number;
    sampler: string;
  };
}

export function ImagePreview({ imageUrl, generating, settings }: ImagePreviewProps) {
  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {generating ? (
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="text-center text-sm text-muted-foreground">
              Generating image...
            </div>
          </div>
        ) : imageUrl ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Generated image"
                className="w-full object-contain"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={() => window.open(imageUrl, '_blank')}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Full Size
              </Button>
            </div>

            {settings && (
              <div className="rounded-lg bg-muted p-3 text-xs">
                <div className="mb-1 font-medium">Settings</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Size: {settings.width} x {settings.height}</div>
                  <div>Steps: {settings.steps}</div>
                  <div>CFG: {settings.cfg}</div>
                  <div>Sampler: {settings.sampler}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>Generated image will appear here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
