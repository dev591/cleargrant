import { test, expect } from '@playwright/test';

test.describe('ClearGrant End-to-End Interconnectivity', () => {
    test('User can publish a grant and instantly view it in Browse Grants', async ({ page }) => {
        // 1. Publish Grant
        await page.goto('http://localhost:5173/dashboard');

        // Fill out grant form
        const uniqueTitle = `E2E Interconnectivity Grant ${Date.now()}`;

        // Find inputs by generic types or labels
        await page.locator('input[type="text"]').first().fill(uniqueTitle);
        await page.locator('textarea').first().fill('Test description');

        // Select domain (Technology)
        await page.locator('select').first().selectOption({ label: 'Technology' });

        // Fill total amount
        await page.locator('input[type="number"]').first().fill('10000');

        // Add milestones (we can just fill the default existing one)
        await page.locator('input[type="text"]').nth(1).fill('First Milestone');
        await page.locator('textarea').nth(1).fill('Deliver the first milestone.');
        await page.locator('input[type="number"]').nth(1).fill('5000');
        await page.locator('input[type="date"]').nth(1).fill('2026-12-31');

        // Submit
        await page.getByRole('button', { name: /Publish Grant on Chain/i }).click();

        // Wait for success status
        await expect(page.getByText('Grant Created on Algorand')).toBeVisible({ timeout: 15000 });

        // 2. Browse Grants
        await page.goto('http://localhost:5173/grants');

        // Verify grant appears
        const newGrantCard = page.locator('.grant-card').filter({ hasText: uniqueTitle });
        await expect(newGrantCard).toBeVisible({ timeout: 10000 });

        // 3. View Grant Details
        await newGrantCard.click();

        // Verify details on the grant page
        await expect(page.locator('h1').filter({ hasText: uniqueTitle })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Technology')).first().toBeVisible();
        await expect(page.locator('.gd-milestones')).toContainText('First Milestone');
    });
});
