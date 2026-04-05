import { test, expect } from '../fixtures/auth'
import AxeBuilder from '@axe-core/playwright'

test.describe('AI Chat (premium)', () => {
  test('premium user can send message and get streaming response', async ({ premiumPage: page }) => {
    await page.goto('/dashboard')

    // Open chat panel
    await page.getByRole('button', { name: /chat|ai|assistant/i }).click()
    await expect(page.getByRole('dialog').or(page.getByTestId('chat-panel'))).toBeVisible()

    // Type a message
    const chatInput = page.getByPlaceholder(/ask|message|type/i)
    await chatInput.fill('What is the current price of AAPL?')
    await page.getByRole('button', { name: /send/i }).click()

    // Response should appear (streaming may take a few seconds)
    await expect(page.getByRole('article').or(page.locator('[data-testid="chat-message"]')).last())
      .toContainText(/\w+/, { timeout: 15_000 })
  })

  test('chat panel has no accessibility violations', async ({ premiumPage: page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /chat|ai|assistant/i }).click()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
