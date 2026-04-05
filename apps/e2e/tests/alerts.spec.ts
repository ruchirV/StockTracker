import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('Alerts', () => {
  test('create alert → verify in list → delete', async ({ loggedInPage: page }) => {
    await page.goto('/alerts')

    // Create a new alert
    await page.getByRole('button', { name: /new alert|add alert|create/i }).click()
    await page.getByLabel(/symbol/i).fill('AAPL')
    await page.getByLabel(/price|threshold/i).fill('500')
    await page.getByRole('button', { name: /save|create|confirm/i }).click()

    // Alert should appear in the list
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/500/)).toBeVisible()

    // Delete the alert
    await page.getByRole('button', { name: /delete|remove/i }).first().click()

    // Confirm deletion if a dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    await expect(page.getByText('AAPL')).not.toBeVisible({ timeout: 5_000 })
  })

  test('alerts page has no accessibility violations', async ({ loggedInPage: page }) => {
    await page.goto('/alerts')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
