'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:text-text-dark prose-p:text-text-body prose-strong:text-text-dark prose-li:text-text-body prose-a:text-maxxed-blue hover:prose-a:text-maxxed-blue-dark">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-text-dark mt-8 mb-4 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-text-dark mt-8 mb-3 pb-2 border-b border-gray-200">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold text-text-dark mt-6 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold text-text-dark mt-4 mb-2">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-text-body leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-text-body">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-text-dark">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-maxxed-blue pl-4 py-2 my-4 bg-blue-50 rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">
              {children}
            </pre>
          ),
          hr: () => (
            <hr className="my-8 border-gray-200" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-bold text-text-dark border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-text-body border-b border-gray-100">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
