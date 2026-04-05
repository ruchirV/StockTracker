import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('Watchlist', () => {
  test('add stock → see price → remove', async ({ loggedInPage: page }) => {
    await page.goto('/dashboard')

    // Search and add AAPL
    const searchInput = page.getByPlaceholder(/search|symbol/i)
    await searchInput.fill('AAPL')
    await page.getByRole('option', { name: /AAPL/i }).first().click()

    // AAPL row should appear in the watchlist
    await expect(page.getByText('AAPL')).toBeVisible({ timeout: 5_000 })

    // Price should be a number (may take a moment for live data)
    const priceCell = page.locator('[data-testid="price-AAPL"], [aria-label*="AAPL price"]').first()
    await expect(priceCell).toContainText(/\$?\d+/, { timeout: 10_000 })

    // Remove AAPL
    await page.getByRole('button', { name: /remove.*AAPL|delete.*AAPL/i }).click()
    await expect(page.getByText('AAPL')).not.toBeVisible({ timeout: 5_000 })
  })

  test('watchlist page has no accessibility violations', async ({ loggedInPage: page }) => {
    await page.goto('/dashboard')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
