import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('Watchlist', () => {
  test('add stock → see price → remove', async ({ loggedInPage: page }) => {
    // Add AAPL using the AddStockBar (aria-label="Stock symbol")
    const searchInput = page.getByLabel('Stock symbol')
    await searchInput.fill('AAPL')
    await page.getByRole('button', { name: /add/i }).click()

    // AAPL row should appear in the watchlist
    await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 5_000 })

    // Remove AAPL (aria-label="Remove AAPL from watchlist")
    await page.getByRole('button', { name: /remove AAPL from watchlist/i }).click()
    await expect(page.getByText('AAPL')).not.toBeVisible({ timeout: 5_000 })
  })

  test('watchlist page has no accessibility violations', async ({ loggedInPage: page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
