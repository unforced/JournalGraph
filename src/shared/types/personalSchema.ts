/**
 * Types for personal schema management
 */

export interface FieldDefinition {
  name: string;
  field_type: 'string' | 'number' | 'boolean' | 'list' | 'reference';
  required: boolean;
  options?: string[];
  reference_type?: string;
  description?: string;
}

export interface EntityTypeDefinition {
  name: string;
  description?: string;
  fields: FieldDefinition[];
  color?: string;
  icon?: string;
  extraction_hints?: string;
}

export interface PersonalSchema {
  user_id: string;
  entity_types: Record<string, EntityTypeDefinition>;
  relationship_types: Record<string, Record<string, unknown>>;
  templates_used: string[];
  created_at: string;
  updated_at: string;
}

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  entity_types: Record<string, EntityTypeDefinition>;
  category: 'wellness' | 'productivity' | 'creativity' | 'relationships' | 'growth';
}

export interface AddEntityTypeRequest {
  entity_type: EntityTypeDefinition;
}

export interface ApplyTemplateRequest {
  template_id: string;
}
