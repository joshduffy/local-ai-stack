'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Trash2, Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Output {
  id: string;
  type: string;
  filename: string | null;
  filepath: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  model: string | null;
  settings: string | null;
  favorite: boolean;
  createdAt: Date;
}

interface GalleryItemProps {
  output: Output;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
}

export function GalleryItem({ output, onToggleFavorite, onDelete }: GalleryItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const imageUrl = output.filepath || '';
  const settings = output.settings ? JSON.parse(output.settings) : null;

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = output.filename || `image-${output.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={output.prompt || 'Generated image'}
              className="h-full w-full object-cover"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => onToggleFavorite(output.id, !output.favorite)}
              >
                <Star
                  className={cn('h-4 w-4', output.favorite && 'fill-yellow-500 text-yellow-500')}
                />
              </Button>
              <Button size="icon" variant="secondary" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setShowDetails(true)}>
                <Info className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Favorite indicator */}
            {output.favorite && (
              <div className="absolute right-2 top-2">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 drop-shadow" />
              </div>
            )}
          </div>

          {output.prompt && (
            <div className="p-2">
              <p className="line-clamp-2 text-xs text-muted-foreground">{output.prompt}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={output.prompt || 'Generated image'}
                className="w-full object-contain"
              />
            </div>
            <div className="space-y-4 text-sm">
              {output.prompt && (
                <div>
                  <div className="font-medium">Prompt</div>
                  <p className="text-muted-foreground">{output.prompt}</p>
                </div>
              )}
              {output.negativePrompt && (
                <div>
                  <div className="font-medium">Negative Prompt</div>
                  <p className="text-muted-foreground">{output.negativePrompt}</p>
                </div>
              )}
              {settings && (
                <div>
                  <div className="font-medium">Settings</div>
                  <div className="space-y-1 text-muted-foreground">
                    {settings.width && settings.height && (
                      <div>Size: {settings.width} x {settings.height}</div>
                    )}
                    {settings.steps && <div>Steps: {settings.steps}</div>}
                    {settings.cfg && <div>CFG: {settings.cfg}</div>}
                    {settings.sampler && <div>Sampler: {settings.sampler}</div>}
                    {settings.seed && <div>Seed: {settings.seed}</div>}
                  </div>
                </div>
              )}
              {output.model && (
                <div>
                  <div className="font-medium">Model</div>
                  <p className="text-muted-foreground">{output.model}</p>
                </div>
              )}
              <div>
                <div className="font-medium">Created</div>
                <p className="text-muted-foreground">
                  {new Date(output.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this image? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(output.id);
                setConfirmDelete(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
