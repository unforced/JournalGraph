const API_BASE = 'http://localhost:8001/api';

export const adminApi = {
  async clearDatabase() {
    const response = await fetch(`${API_BASE}/admin/clear-database`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear database: ${response.statusText}`);
    }

    return response.json();
  },

  async getDatabaseStats() {
    const response = await fetch(`${API_BASE}/admin/stats`);

    if (!response.ok) {
      throw new Error(`Failed to get database stats: ${response.statusText}`);
    }

    return response.json();
  },

  async resetAllData() {
    const response = await fetch(`${API_BASE}/admin/reset-all`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to reset all data: ${response.statusText}`);
    }

    return response.json();
  },
};
