import { test as base, expect, type Page } from '@playwright/test'

export interface AuthFixtures {
  loggedInPage: Page
  premiumPage: Page
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL(/dashboard|watchlist/, { timeout: 10_000 })
}

export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    const email = process.env['E2E_USER_EMAIL'] ?? 'e2e-user@test.com'
    const password = process.env['E2E_USER_PASSWORD'] ?? 'TestPassword123!'
    await loginAs(page, email, password)
    await use(page)
  },

  premiumPage: async ({ page }, use) => {
    const email = process.env['E2E_PREMIUM_EMAIL'] ?? 'e2e-premium@test.com'
    const password = process.env['E2E_PREMIUM_PASSWORD'] ?? 'TestPassword123!'
    await loginAs(page, email, password)
    await use(page)
  },
})

export { expect }
