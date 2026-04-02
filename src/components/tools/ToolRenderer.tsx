'use client';

import dynamic from 'next/dynamic';
import { TOOL_REGISTRY } from './registry';
import { ExportableToolShell } from './ExportableToolShell';

function ToolLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-100 rounded-lg w-64" />
      <div className="h-4 bg-gray-100 rounded w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

// Cache dynamic components so they aren't re-created on every render
const componentCache = new Map<string, ReturnType<typeof dynamic>>();

function getDynamicComponent(slug: string) {
  if (!componentCache.has(slug)) {
    const entry = TOOL_REGISTRY[slug];
    if (!entry) return null;
    componentCache.set(
      slug,
      dynamic(entry.component, { ssr: false, loading: () => <ToolLoadingSkeleton /> }),
    );
  }
  return componentCache.get(slug)!;
}

interface ToolRendererProps {
  slug: string;
  toolTitle: string;
}

export function ToolRenderer({ slug, toolTitle }: ToolRendererProps) {
  const entry = TOOL_REGISTRY[slug];
  const ToolComponent = getDynamicComponent(slug);

  if (!entry || !ToolComponent) return null;

  return (
    <ExportableToolShell toolTitle={toolTitle} exportFormats={entry.exportFormats}>
      <ToolComponent />
    </ExportableToolShell>
  );
}
