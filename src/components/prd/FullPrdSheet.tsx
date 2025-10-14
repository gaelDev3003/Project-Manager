'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Download, Copy, FileText, Code, Check } from 'lucide-react';
import PRDViewer from './PRDViewer';

interface FullPrdSheetProps {
  version: {
    id: string;
    title: string;
    date: string;
    status: string;
    content_md?: string | null;
    summary_json?: any;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FullPrdSheet({
  version,
  open,
  onOpenChange,
}: FullPrdSheetProps) {
  const isMobile = useMobile();
  const [viewMode, setViewMode] = useState<'formatted' | 'json' | 'markdown'>(
    'formatted'
  );
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getJsonContent = () => {
    return version.summary_json
      ? JSON.stringify(version.summary_json, null, 2)
      : '';
  };

  const getMarkdownContent = () => {
    return version.content_md || '';
  };

  const getFormattedContent = () => {
    if (
      version.content_md &&
      !version.content_md.includes(
        'This is a fallback response due to JSON parsing issues'
      )
    ) {
      return version.content_md;
    }
    return version.summary_json
      ? JSON.stringify(version.summary_json, null, 2)
      : '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'p-0 flex flex-col',
          isMobile ? 'h-[90vh]' : 'w-full sm:max-w-4xl'
        )}
      >
        <SheetHeader className="border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl">{version.title}</SheetTitle>
              <SheetDescription>
                Version {version.id} • Last updated{' '}
                {new Date(version.date).toLocaleDateString()}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{version.status}</Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Action Bar */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'formatted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('formatted')}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Formatted
              </Button>
              <Button
                variant={viewMode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('json')}
                className="text-xs"
              >
                <Code className="h-3 w-3 mr-1" />
                JSON
              </Button>
              <Button
                variant={viewMode === 'markdown' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('markdown')}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Markdown
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const content =
                    viewMode === 'json'
                      ? getJsonContent()
                      : viewMode === 'markdown'
                        ? getMarkdownContent()
                        : getFormattedContent();
                  handleCopy(content, viewMode);
                }}
                className="text-xs"
              >
                {copied === viewMode ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copied === viewMode ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const content =
                    viewMode === 'json'
                      ? getJsonContent()
                      : viewMode === 'markdown'
                        ? getMarkdownContent()
                        : getFormattedContent();
                  const filename = `${version.title.replace(/\s+/g, '_')}_${viewMode}.${viewMode === 'json' ? 'json' : 'md'}`;
                  handleDownload(content, filename);
                }}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {viewMode === 'formatted' ? (
              version.summary_json ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <PRDViewer prd={version.summary_json} isEmbedded={true} />
                </div>
              ) : version.content_md &&
                !version.content_md.includes(
                  'This is a fallback response due to JSON parsing issues'
                ) ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-ul:text-gray-700 prose-li:text-gray-700 prose-li:leading-relaxed prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-6 prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-5 prose-h3:text-lg prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: version.content_md,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>PRD 내용이 없습니다.</p>
                </div>
              )
            ) : viewMode === 'json' ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                  {getJsonContent() || 'JSON 데이터가 없습니다.'}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                  {getMarkdownContent() || 'Markdown 데이터가 없습니다.'}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
