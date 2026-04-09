import { test, expect } from '@playwright/test'

test.describe('Log Management tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Log Management' }).click()
    await expect(page.getByRole('heading', { name: 'Log Management' })).toBeVisible()
  })

  test('shows generate log form', async ({ page }) => {
    await expect(page.getByText('Generate New Log Entry')).toBeVisible()
  })

  test('shows filter section', async ({ page }) => {
    await expect(page.getByText('Filter Logs')).toBeVisible()
  })

  test('can fill the log generation form', async ({ page }) => {
    // Select level
    await page.selectOption('select', 'ERROR')
    // Fill message
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first()
    if (await messageInput.count() > 0) {
      await messageInput.fill('Test error message')
    }
  })

  test('generate button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Generate Log' })).toBeVisible()
  })
})
