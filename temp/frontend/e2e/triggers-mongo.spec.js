import { test, expect } from '@playwright/test'

test.describe('DB Triggers tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'DB Triggers' }).click()
    await expect(page.getByRole('heading', { name: 'DB Triggers' })).toBeVisible()
  })

  test('shows all three trigger cards', async ({ page }) => {
    await expect(page.getByText('Log Cleanup')).toBeVisible()
    await expect(page.getByText('Alert Escalation')).toBeVisible()
    await expect(page.getByText('Server Health Check')).toBeVisible()
  })

  test('log cleanup has days input', async ({ page }) => {
    const input = page.locator('input[type="number"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('30')
  })

  test('all execute buttons are present', async ({ page }) => {
    const buttons = page.getByRole('button', { name: 'Execute' })
    await expect(buttons).toHaveCount(3)
  })
})

test.describe('Mongo Console tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Mongo Console' }).click()
    await expect(page.getByRole('heading', { name: 'Mongo Console' })).toBeVisible()
  })

  test('shows quick command buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'db.log_entries.find()' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'db.applications.count()' })).toBeVisible()
  })

  test('shows textarea command editor', async ({ page }) => {
    const area = page.locator('textarea')
    await expect(area).toBeVisible()
  })

  test('shows run button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Run/i })).toBeVisible()
  })

  test('can type a command', async ({ page }) => {
    const area = page.locator('textarea')
    await area.fill('db.log_entries.count()')
    await expect(area).toHaveValue('db.log_entries.count()')
  })
})
