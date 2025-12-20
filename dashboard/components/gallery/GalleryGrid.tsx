'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GalleryItem, type Output } from './GalleryItem';
import { Search, Star, RefreshCw } from 'lucide-react';

export function GalleryGrid() {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const fetchOutputs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (favoritesOnly) params.set('favorites', 'true');

      const res = await fetch(`/api/gallery?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOutputs(data.outputs || []);
      }
    } catch (err) {
      console.error('Failed to fetch gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputs();
  }, [favoritesOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOutputs();
  };

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, favorite }),
      });
      setOutputs((prev) =>
        prev.map((o) => (o.id === id ? { ...o, favorite } : o))
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      setOutputs((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by prompt..."
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <Button
          variant={favoritesOnly ? 'default' : 'outline'}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          <Star className={`mr-2 h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
          Favorites
        </Button>

        <Button variant="outline" onClick={fetchOutputs}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : outputs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
          <p>No images found</p>
          <p className="text-sm">Generate some images to see them here</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {outputs.map((output) => (
            <GalleryItem
              key={output.id}
              output={output}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
