'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Image, FolderOpen, Activity, ExternalLink } from 'lucide-react';

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/chat">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <MessageSquare className="h-6 w-6" />
            <span>Start Chat</span>
          </Button>
        </Link>

        <Link href="/images">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <Image className="h-6 w-6" />
            <span>Generate Image</span>
          </Button>
        </Link>

        <Link href="/gallery">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <FolderOpen className="h-6 w-6" />
            <span>View Gallery</span>
          </Button>
        </Link>

        <a href="http://127.0.0.1:8188" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="h-24 w-full flex-col gap-2">
            <ExternalLink className="h-6 w-6" />
            <span>Open ComfyUI</span>
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
