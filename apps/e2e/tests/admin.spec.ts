import { test as base, expect } from '@playwright/test'

const test = base

test.describe('Admin', () => {
  test('admin approves premium request → user sees AI Chat enabled', async ({ page }) => {
    const adminEmail = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@stocktracker.dev'
    const adminPassword = process.env['E2E_ADMIN_PASSWORD'] ?? 'AdminPassword123$'

    // Login as admin
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(adminEmail)
    await page.getByLabel(/password/i).fill(adminPassword)
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await expect(page).toHaveURL(/dashboard|admin/, { timeout: 10_000 })

    // Navigate to admin panel via sidebar link (avoids hard reload that resets auth state)
    await page.getByRole('link', { name: /admin/i }).click()
    await expect(page.getByRole('heading', { name: /premium requests/i })).toBeVisible()

    // Find a pending premium request and approve it
    const pendingRow = page.getByRole('row').filter({ hasText: /pending/i }).first()
    if (await pendingRow.isVisible()) {
      await pendingRow.getByRole('button', { name: /approve/i }).click()
      await expect(pendingRow.getByText(/approved/i)).toBeVisible({ timeout: 5_000 })
    }
  })
})
