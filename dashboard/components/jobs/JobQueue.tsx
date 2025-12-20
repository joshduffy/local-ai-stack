'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Trash2, Image, MessageSquare, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Job {
  id: string;
  type: 'chat' | 'image';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: string;
  output: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function JobQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Refresh every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (jobId: string) => {
    try {
      await fetch(`/api/jobs?id=${jobId}`, { method: 'DELETE' });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: Job['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'running':
        return 'default';
      case 'completed':
        return 'outline';
      case 'failed':
        return 'destructive';
    }
  };

  const counts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Job Queue</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="running">Running ({counts.running})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({counts.failed})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No jobs found
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredJobs.map((job) => {
                    const input = JSON.parse(job.input);
                    return (
                      <div
                        key={job.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {job.type === 'image' ? (
                            <Image className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusVariant(job.status)}>
                                {getStatusIcon(job.status)}
                                <span className="ml-1">{job.status}</span>
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(job.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="line-clamp-1 text-sm text-muted-foreground">
                              {input.prompt || input.messages?.[0]?.content || 'No details'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {job.error && (
                            <span className="text-xs text-destructive">{job.error}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
