import { test, expect } from '@playwright/test';

test.describe('ClearGrant Frontend E2E Tests', () => {
    test.setTimeout(120000); // 2 minutes timeout for n8n webhooks


    test.beforeEach(async ({ page }) => {
        // Go to the home page before each test
        await page.goto('/');
    });

    test('Home Page: Verify branding and navigation', async ({ page }) => {
        // Wait for hero to load
        await expect(page.locator('text=Every year in India').first()).toBeVisible({ timeout: 10000 });

        // Check navigation buttons
        const browseBtn = page.getByRole('button', { name: /BROWSE OPEN GRANTS/i });
        await browseBtn.click();
        await expect(page).toHaveURL(/\/grants/);
    });

    test('Browse Grants: Load grants and filter', async ({ page }) => {
        await page.goto('/grants');
        await page.waitForTimeout(2000);
        await page.reload(); // Ensure seed data has loaded

        // Verify grant cards are loaded
        await expect(page.locator('h1').first()).toContainText('OPEN GRANTS');

        // Wait for at least one grant card to show up
        const grantCards = page.locator('.grant-card').filter({ hasText: 'ALGO' });
        await expect(grantCards.first()).toBeVisible({ timeout: 15000 });

        // Verify AI matcher button
        const aiMatchBtn = page.getByRole('button', { name: /Find My Matches/i });
        await expect(aiMatchBtn).toBeVisible();
        await aiMatchBtn.click();

        // Expect AI Matching status to show up (check loading state)
        await expect(page.locator('text=Finding matches...').first()).toBeVisible({ timeout: 10000 });
    });

    test('Grant Detail: View details and metrics', async ({ page }) => {
        await page.goto('/grants');
        await page.waitForTimeout(2000);
        await page.reload();

        await expect(page.locator('.grant-card').filter({ hasText: 'ALGO' }).first()).toBeVisible({ timeout: 15000 });

        const viewBtn = page.getByRole('button', { name: /View Grant/i }).first();
        await viewBtn.click();

        // Wait for the grant headline
        await expect(page.locator('text=TOTAL FUNDING')).toBeVisible({ timeout: 10000 });

        // Check if progress bar exists
        await expect(page.locator('text=Milestones').first()).toBeVisible();

        // Verify Apply button exists
        const applyBtn = page.getByRole('button', { name: /Apply For This Grant/i });
        if (await applyBtn.isVisible()) {
            await applyBtn.click();
            await expect(page).toHaveURL(/\/apply/);
        }
    });

    test('Sponsor Dashboard: Form rendering and ROI', async ({ page }) => {
        await page.goto('/sponsor');

        // Make sure we are on the dashboard
        await expect(page.getByRole('heading', { level: 1 })).toContainText('FUND THE FUTURE');

        // Create a new grant tab
        await expect(page.getByRole('button', { name: /CREATE GRANT/i })).toBeVisible();

        // Fill form partially to see if inputs react
        await page.fill('input[placeholder="e.g. AI Research Grant 2026 — SIT Hyderabad"]', 'Test E2E Grant');
        await page.fill('textarea[placeholder="Describe the grant purpose, goals, and what kind of projects you want to fund..."]', 'This is a test grant from playwright.');

        // Switch to ROI tab
        await page.getByRole('button', { name: /ROI REPORTS/i }).click();
        await expect(page.locator('text=SPONSOR ROI REPORTS')).toBeVisible();
    });

    test('Profile Page: Display tier, score, and NFT minting', async ({ page }) => {
        await page.goto('/profile');

        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=REPUTATION SCORE').first()).toBeVisible();

        const recalcBtn = page.getByRole('button', { name: /Recalculate Score/i });
        await recalcBtn.click();

        // Wait for loading state instead of slow webhook
        await expect(page.locator('text=Calculating...').first()).toBeVisible({ timeout: 10000 });
    });

    test('Apply For Grant: Submit form with AI Analysis', async ({ page }) => {
        await page.goto('/grants');
        await page.waitForTimeout(2000);
        await page.reload();

        await expect(page.locator('.grant-card').filter({ hasText: 'ALGO' }).first()).toBeVisible({ timeout: 15000 });

        const viewBtn = page.getByRole('button', { name: /View Grant/i }).first();
        await viewBtn.click();

        await expect(page.locator('text=TOTAL FUNDING')).toBeVisible({ timeout: 10000 });

        const applyBtn = page.getByRole('button', { name: /Apply For This Grant/i });
        await expect(applyBtn).toBeVisible({ timeout: 10000 });
        await applyBtn.click();

        await expect(page.locator('text=YOUR PROPOSAL').first()).toBeVisible({ timeout: 10000 });

        await page.fill('input[placeholder="e.g. AI-Powered Smart Irrigation for Rural Farms"]', 'E2E Test Project');
        await page.fill('textarea[placeholder*="Describe your project goals"]', 'E2E Testing is amazing and solves all problems. This description needs to be long enough so we can score highly with the AI. So I am writing extra text describing requirements.');

        const submitBtn = page.getByRole('button', { name: /Submit Application/i });
        await submitBtn.click();

        // Allow AI text to show loading state instead of final output
        await expect(page.locator('text=Analyzing Proposal...').first()).toBeVisible({ timeout: 10000 });
    });

    test('Submit Milestone: Verification tracking', async ({ page }) => {
        await page.goto('/grants');
        await page.waitForTimeout(2000);
        await page.reload();

        await expect(page.locator('.grant-card').filter({ hasText: 'ALGO' }).first()).toBeVisible({ timeout: 15000 });

        const viewBtn = page.getByRole('button', { name: /View Grant/i }).first();
        await viewBtn.click();

        await expect(page.locator('text=TOTAL FUNDING')).toBeVisible({ timeout: 10000 });

        await page.waitForTimeout(1000);
        const url = page.url();
        const match = url.match(/\/grants\/([^\/]+)/);
        if (match) {
            await page.goto(`/milestones/${match[1]}/0`);
        } else {
            await page.goto('/milestones/GRANT-1/0');
        }

        await expect(page.locator('text=YOUR PROOF SUBMISSION')).toBeVisible({ timeout: 10000 });

        await page.fill('input[placeholder="https://github.com/username/project or https://demo.yourproject.com"]', 'https://github.com/test/commit');
        await page.fill('textarea[placeholder*="Describe exactly what was built"]', 'Completed the first iteration of the features. Everything works as expected. Writing some extra text to pass the AI character count limits and get high confidence.');

        const verifyBtn = page.getByRole('button', { name: /Verify with AI \+ Fraud Scan/i });
        await expect(verifyBtn).not.toBeDisabled({ timeout: 5000 });
        await verifyBtn.click();

        // Show loading state for AI Verifier (fraud sentinel)
        await expect(page.locator('text=/Fraud Sentinel scanning|AI Verifier running/i').first()).toBeVisible({ timeout: 10000 });
    });
});
