/**
 * API functions for personal schema management
 */

import {
  PersonalSchema,
  SchemaTemplate,
  EntityTypeDefinition,
  AddEntityTypeRequest,
  ApplyTemplateRequest,
} from '../../../shared/types/personalSchema';

const API_BASE = 'http://localhost:8001/api';

export async function getPersonalSchema(userId: string = 'default'): Promise<PersonalSchema> {
  const response = await fetch(`${API_BASE}/personal-schema?user_id=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch personal schema: ${response.statusText}`);
  }
  return response.json();
}

export async function getSchemaTemplates(): Promise<SchemaTemplate[]> {
  const response = await fetch(`${API_BASE}/personal-schema/templates`);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema templates: ${response.statusText}`);
  }
  return response.json();
}

export async function addEntityType(
  entityType: EntityTypeDefinition,
  userId: string = 'default'
): Promise<{ success: boolean; message: string; schema: PersonalSchema }> {
  const response = await fetch(`${API_BASE}/personal-schema/entity-types?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entity_type: entityType } as AddEntityTypeRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add entity type: ${error}`);
  }
  return response.json();
}

export async function removeEntityType(
  entityName: string,
  userId: string = 'default'
): Promise<{ success: boolean; message: string; schema: PersonalSchema }> {
  const response = await fetch(
    `${API_BASE}/personal-schema/entity-types/${entityName}?user_id=${userId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to remove entity type: ${error}`);
  }
  return response.json();
}

export async function applyTemplate(
  templateId: string,
  userId: string = 'default'
): Promise<{ success: boolean; message: string; schema: PersonalSchema }> {
  const response = await fetch(`${API_BASE}/personal-schema/apply-template?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_id: templateId } as ApplyTemplateRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to apply template: ${error}`);
  }
  return response.json();
}

export async function getEntityType(
  entityName: string,
  userId: string = 'default'
): Promise<EntityTypeDefinition> {
  const response = await fetch(
    `${API_BASE}/personal-schema/entity-types/${entityName}?user_id=${userId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch entity type: ${response.statusText}`);
  }
  return response.json();
}

export async function createSchema(schema: PersonalSchema): Promise<PersonalSchema> {
  const response = await fetch(`${API_BASE}/personal-schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schema),
  });

  if (!response.ok) {
    throw new Error(`Failed to create schema: ${response.statusText}`);
  }
  return response.json();
}

// Export all functions as a namespace for convenience
export const personalSchemaApi = {
  getPersonalSchema,
  getSchemaTemplates,
  addEntityType,
  removeEntityType,
  applyTemplate,
  getEntityType,
  createSchema,
};
