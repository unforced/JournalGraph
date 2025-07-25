import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { highlightEntities } from '../utils/entityHighlight';

export interface Entity {
  uuid: string;
  name: string;
  type: string;
  summary?: string;
  start_char?: number;
  end_char?: number;
}

interface EntityHighlighterProps {
  content: string;
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  className?: string;
}

// Entity type to color mapping
const ENTITY_COLORS: Record<string, string> = {
  Person: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  Project: 'bg-green-100 text-green-800 hover:bg-green-200',
  Concept: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  Event: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  Task: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  Entity: 'bg-gray-100 text-gray-800 hover:bg-gray-200', // Default
};

export const EntityHighlighter: React.FC<EntityHighlighterProps> = ({
  content,
  entities,
  onEntityClick,
  className = '',
}) => {
  // Preprocess content to add entity markers
  const processedContent = useMemo(() => highlightEntities(content, entities), [content, entities]);

  // Create entity map for quick lookup
  const entityMap = useMemo(() => new Map(entities.map((e) => [e.uuid, e])), [entities]);
  // Process content to highlight entities
  const processContent = (text: string): React.ReactNode[] => {
    // Split content by entity markers
    const parts = text.split(/({{entity:[^}]+}})/g);

    return parts.map((part, index) => {
      const entityMatch = part.match(/{{entity:([^:]+):([^:]+):([^}]+)}}/);
      if (entityMatch) {
        const [, uuid, type, name] = entityMatch;
        const entity = entityMap.get(uuid);

        if (entity) {
          const colorClass = ENTITY_COLORS[type] || ENTITY_COLORS.Entity;
          return (
            <span
              key={`entity-${index}`}
              className={`inline-flex items-center px-1 py-0.5 rounded cursor-pointer transition-colors ${colorClass}`}
              onClick={(e) => {
                e.stopPropagation();
                onEntityClick?.(entity);
              }}
              title={entity.summary || `${entity.type}: ${entity.name}`}
            >
              {name}
            </span>
          );
        }
      }
      return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom paragraph renderer that processes entity markers
          p: ({ children }) => {
            const processChildren = (children: any): any => {
              if (typeof children === 'string') {
                return processContent(children);
              }
              if (Array.isArray(children)) {
                return children.map((child) => processChildren(child));
              }
              if (children?.props?.children) {
                return {
                  ...children,
                  props: {
                    ...children.props,
                    children: processChildren(children.props.children),
                  },
                };
              }
              return children;
            };

            return <p className="mb-3 leading-relaxed">{processChildren(children)}</p>;
          },
          // Keep all the markdown styling from MarkdownRenderer
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => {
            const processChildren = (children: any): any => {
              if (typeof children === 'string') {
                return processContent(children);
              }
              if (Array.isArray(children)) {
                return children.map((child) => processChildren(child));
              }
              return children;
            };
            return <h2 className="text-xl font-semibold mt-3 mb-2">{processChildren(children)}</h2>;
          },
          h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 ml-4">{children}</ol>,
          li: ({ children }) => {
            const processChildren = (children: any): any => {
              if (typeof children === 'string') {
                return processContent(children);
              }
              if (Array.isArray(children)) {
                return children.map((child) => processChildren(child));
              }
              if (children?.props?.children) {
                return {
                  ...children,
                  props: {
                    ...children.props,
                    children: processChildren(children.props.children),
                  },
                };
              }
              return children;
            };
            return <li className="mb-1">{processChildren(children)}</li>;
          },
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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
