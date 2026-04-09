import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('switches to Log Management tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Log Management' }).click()
    await expect(page.getByRole('heading', { name: 'Log Management' })).toBeVisible()
  })

  test('switches to CRUD Operations tab', async ({ page }) => {
    await page.getByRole('button', { name: 'CRUD Operations' }).click()
    await expect(page.getByRole('heading', { name: 'CRUD Operations' })).toBeVisible()
  })

  test('switches to DB Triggers tab', async ({ page }) => {
    await page.getByRole('button', { name: 'DB Triggers' }).click()
    await expect(page.getByRole('heading', { name: 'DB Triggers' })).toBeVisible()
  })

  test('switches to Mongo Console tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Mongo Console' }).click()
    await expect(page.getByRole('heading', { name: 'Mongo Console' })).toBeVisible()
  })

  test('footer always visible', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible()
    await expect(page.getByText('Spring Boot')).toBeVisible()
  })
})
