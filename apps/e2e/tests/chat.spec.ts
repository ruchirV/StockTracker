import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const premiumEmail = process.env['E2E_PREMIUM_EMAIL'] ?? 'e2e-premium@stocktracker.dev'
const premiumPassword = process.env['E2E_PREMIUM_PASSWORD'] ?? 'E2ePremium123$'

test.describe.serial('AI Chat (premium)', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'
    const ctx = await browser.newContext({ baseURL })
    page = await ctx.newPage()
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(premiumEmail)
    await page.getByLabel(/^password$/i).fill(premiumPassword)
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await expect(page).toHaveURL(/dashboard|watchlist/, { timeout: 15_000 })
  })

  test.afterAll(async () => {
    await page.context().close()
  })

  test('premium user can send message and get streaming response', async () => {
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

  test('chat panel has no accessibility violations', async () => {
    // Chat panel may already be open from previous test; ensure it is
    const panel = page.locator('div[role="dialog"]')
    if (!(await panel.isVisible())) {
      await page.getByRole('button', { name: /ai chat/i }).click()
      await expect(panel).toBeVisible()
    }
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
