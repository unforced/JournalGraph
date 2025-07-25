import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom renderers for different elements
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 ml-4">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <code className="block bg-gray-100 p-3 rounded my-3 text-sm font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-gray-300" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
