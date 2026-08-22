'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  generateExamplePostsApi,
  getExamplePostsApi,
  type ExamplePostItem,
  type ExamplePostsMeta,
} from '@/features/user/api';

export function ExamplePostsCard() {
  const [onboarded, setOnboarded] = useState(false);
  const [posts, setPosts] = useState<ExamplePostItem[]>([]);
  const [meta, setMeta] = useState<ExamplePostsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await getExamplePostsApi();
      setOnboarded(response.data.onboarded === true);
      setMeta(response.data.examplePostsMeta);
      setPosts(response.data.examplePosts ?? []);
    } catch (error) {
      if (!silent) showErrorToast('Failed to load example posts.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (meta?.status !== 'running') return;
    const timer = window.setInterval(() => void load(true), 5_000);
    return () => window.clearInterval(timer);
  }, [load, meta?.status]);

  const generate = async () => {
    if (generating || meta?.used) return;
    setGenerating(true);
    try {
      const response = await generateExamplePostsApi();
      setMeta({
        status: 'running',
        used: true,
        expectedCount: response.data.expectedCount,
        completedCount: 0,
        platforms: response.data.platforms,
        postsPerPlatform: response.data.postsPerPlatform,
      });
    } catch (error) {
      showErrorToast('Failed to start example-post generation.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="overflow-hidden rounded-2xl border-border">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Generate example posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One free brand preview for Facebook, Instagram, and LinkedIn. No credits used and nothing is scheduled.
            </p>
          </div>
        </div>

        {!onboarded ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/brand-dna">Complete Brand DNA</Link>
          </Button>
        ) : meta?.status === 'running' || generating ? (
          <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating {posts.length} of {meta?.expectedCount ?? 3}
          </div>
        ) : meta?.used || meta?.status === 'completed' ? (
          <p className="shrink-0 text-sm text-muted-foreground">
            {posts.length > 0 ? 'Examples ready' : 'Free examples already used'}
          </p>
        ) : (
          <Button size="sm" onClick={() => void generate()} disabled={generating}>
            Generate examples
          </Button>
        )}
      </div>

      {posts.length > 0 && (
        <div className="grid gap-4 border-t border-border bg-muted/20 p-5 md:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-square bg-muted">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt={`${post.platform} example`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Image unavailable</div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{post.platform}</p>
                <p className="line-clamp-5 whitespace-pre-wrap text-sm text-foreground">{post.caption || 'No caption'}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
