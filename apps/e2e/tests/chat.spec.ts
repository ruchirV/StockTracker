import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('AI Chat (premium)', () => {
  test('premium user can send message and get streaming response', async ({ premiumPage: page }) => {
    // Add a stock first so selectedSymbol is populated (chat requires a watchlist item)
    await page.getByLabel('Stock symbol').fill('AAPL')
    await page.getByRole('button', { name: /add/i }).click()
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5_000 })

    // Open chat panel via sidebar button (SPA nav — no reload)
    await page.getByRole('button', { name: /ai chat/i }).click()

    // Panel renders as a fixed div (not a dialog)
    const panel = page.locator('div[role="dialog"]')
    await expect(panel).toBeVisible()

    // Wait for symbol to be selected (auto-selects first watchlist item)
    await expect(page.locator('select[aria-label="Select symbol"]')).toBeVisible({ timeout: 5_000 })

    // Type a message and send
    const chatInput = page.getByPlaceholder(/ask about your portfolio/i)
    await chatInput.fill('What is the current price of AAPL?')
    await page.locator('button[aria-label="Send"]').click()

    // User bubble appears immediately, then response follows
    await expect(panel.locator('div.rounded-2xl').first())
      .toContainText('What is the current price of AAPL?', { timeout: 5_000 })

    // Response bubble should appear
    await expect(panel.locator('div.rounded-2xl').last())
      .toContainText(/\w+/, { timeout: 15_000 })
  })

  test('chat panel has no accessibility violations', async ({ premiumPage: page }) => {
    await page.getByRole('button', { name: /ai chat/i }).click()
    await expect(page.locator('div[role="dialog"]')).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
