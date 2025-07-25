import { test, expect } from '@playwright/test';

test.describe('JournalGraph E2E Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await expect(page).toHaveTitle(/JournalGraph/);

    // Check for main UI elements
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
  });

  test('should open import dialog', async ({ page }) => {
    await page.goto('/');

    // Click import button
    await page.click('[data-testid="import-button"]');

    // Check dialog is visible
    await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();
  });

  test('should handle folder selection', async ({ page }) => {
    await page.goto('/');

    // Mock the folder selection
    await page.evaluate(() => {
      // @ts-expect-error - Only mocking required method for this test
      window.electronAPI = {
        selectFolder: async () => '/mock/journal/path',
      };
    });

    await page.click('[data-testid="select-folder-button"]');

    // Verify folder path is displayed
    await expect(page.locator('[data-testid="selected-folder"]')).toContainText(
      '/mock/journal/path'
    );
  });
});
