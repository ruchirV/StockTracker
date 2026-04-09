import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('Alerts', () => {
  test('create alert → verify in list → delete', async ({ loggedInPage: page }) => {
    await page.getByRole('link', { name: /alerts/i }).click()

    // Create a new alert
    await page.getByRole('button', { name: /new alert|add alert|create/i }).click()
    await page.getByLabel(/symbol/i).fill('AAPL')
    await page.getByLabel('Price ($)').fill('500')
    await page.getByRole('button', { name: /add alert/i }).click()

    // Alert should appear in the list
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/500/)).toBeVisible()

    // Delete the alert (aria-label is "Delete alert for AAPL …")
    await page.getByRole('button', { name: /delete alert for AAPL/i }).first().click()

    await expect(page.getByText('AAPL')).not.toBeVisible({ timeout: 5_000 })
  })

  test('alerts page has no accessibility violations', async ({ loggedInPage: page }) => {
    await page.getByRole('link', { name: /alerts/i }).click()
    await page.waitForURL(/alerts/)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
