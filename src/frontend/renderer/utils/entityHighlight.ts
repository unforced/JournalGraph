import { Entity } from '../components/EntityHighlighter';

/**
 * Preprocesses content to add entity markers for highlighting
 *
 * @param content - The raw journal content
 * @param entities - Array of entities found in the content
 * @returns Content with entity markers inserted
 */
export function highlightEntities(content: string, entities: Entity[]): string {
  if (!content || !entities || entities.length === 0) {
    return content;
  }

  // Sort entities by name length (longest first) to handle overlapping names
  const sortedEntities = [...entities].sort((a, b) => b.name.length - a.name.length);

  let processedContent = content;

  // Track replacements to avoid double-processing
  const replacements = new Map<string, string>();

  sortedEntities.forEach((entity) => {
    // Escape special regex characters in entity name
    const escapedName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a unique placeholder to avoid double-processing
    const placeholder = `__ENTITY_${entity.uuid}__`;
    const marker = `{{entity:${entity.uuid}:${entity.type}:${entity.name}}}`;

    // First pass: replace entity names with placeholders
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    processedContent = processedContent.replace(regex, placeholder);

    // Store the mapping
    replacements.set(placeholder, marker);
  });

  // Second pass: replace placeholders with markers
  replacements.forEach((marker, placeholder) => {
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), marker);
  });

  return processedContent;
}
