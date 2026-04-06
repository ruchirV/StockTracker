import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Authentication', () => {
  test('register → login → logout', async ({ page }) => {
    const timestamp = Date.now()
    const email = `e2e-${timestamp}@test.com`
    const password = 'TestPassword123!'

    // Register
    await page.goto('/register')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/^confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account|register|sign up/i }).click()

    // Should land on dashboard or login after registration
    await expect(page).toHaveURL(/dashboard|login/, { timeout: 10_000 })

    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await expect(page).toHaveURL(/dashboard|watchlist/, { timeout: 10_000 })

    // Logout
    await page.getByRole('button', { name: /log out|sign out/i }).click()
    await expect(page).toHaveURL(/login|\//, { timeout: 5_000 })
  })

  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('register page has no accessibility violations', async ({ page }) => {
    await page.goto('/register')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nonexistent@test.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await expect(page.getByRole('alert').or(page.getByText(/invalid|incorrect/i))).toBeVisible()
  })
})
