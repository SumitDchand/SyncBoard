import { test, expect } from '@playwright/test';

test.describe('SyncBoard End-to-End User Workflows', () => {
  const uniqueId = Date.now();
  const testUser = {
    name: `User ${uniqueId}`,
    email: `e2e_${uniqueId}@syncboard.dev`,
    password: 'Password123!',
  };

  test('should protect private routes and redirect unauthenticated users to /login', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Welcome to SyncBoard');
  });

  test('should register a new user and navigate to dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="Sarah Connor"]', testUser.name);
    await page.fill('input[placeholder="sarah@cyberdyne.com"]', testUser.email);
    await page.fill('input[placeholder="Minimum 6 characters"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('should authenticate an existing user via login form and persist session', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('header')).toContainText('SyncBoard');

    // Test authentication persistence on page reload
    await page.reload();
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('should create a board, create tasks, and manage Kanban columns', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Click "Create Board"
    await page.click('button:has-text("Create Board")');
    await page.fill(
      'input[placeholder="e.g. Q4 Growth & Infrastructure Sprint"]',
      `Sprint Board ${uniqueId}`
    );
    await page.fill(
      'textarea[placeholder="Sprint goals, milestones, or project purpose..."]',
      'Automated E2E Test Board'
    );
    await page.click('button[type="submit"]:has-text("Create Board")');

    // Board card should appear in dashboard
    const boardCard = page.locator(`text=Sprint Board ${uniqueId}`);
    await expect(boardCard).toBeVisible();

    // Click to enter board
    await boardCard.click();
    await expect(page).toHaveURL(/.*\/boards\/.*/);

    // Verify Kanban columns are visible
    await expect(page.locator('h3:has-text("To Do")')).toBeVisible();
    await expect(page.locator('h3:has-text("In Progress")')).toBeVisible();
    await expect(page.locator('h3:has-text("Review")')).toBeVisible();
    await expect(page.locator('h3:has-text("Completed")')).toBeVisible();

    // Create a new task
    await page.click('button:has-text("New Task")');
    const modal = page.locator('.fixed form');
    await modal.locator('input[placeholder="e.g. Implement WebSocket reconnection handler"]').fill('E2E Test Task 1');
    await modal.locator('textarea').fill('Task created through automated Playwright workflow');
    await modal.locator('button[type="submit"]:has-text("Create Task")').click();

    // Task card should render in "To Do" column
    await expect(page.locator('h4:has-text("E2E Test Task 1")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span:has-text("Medium")')).toBeVisible();

    // Filter tasks
    await page.fill('input[placeholder="Search tasks or tags..."]', 'E2E Test');
    await expect(page.locator('h4:has-text("E2E Test Task 1")')).toBeVisible();

    await page.fill('input[placeholder="Search tasks or tags..."]', 'NonExistentTask');
    await expect(page.locator('h4:has-text("E2E Test Task 1")')).not.toBeVisible();
  });

  test('should support multiple concurrent users collaborating on the same board in real-time', async ({
    browser,
  }) => {
    // 1. Create two independent browser contexts (User A and User B)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // User A registers
    const userAEmail = `collabA_${Date.now()}@syncboard.dev`;
    await pageA.goto('http://localhost:5173/register');
    await pageA.fill('input[placeholder="Sarah Connor"]', 'Collaborator Alpha');
    await pageA.fill('input[placeholder="sarah@cyberdyne.com"]', userAEmail);
    await pageA.fill('input[placeholder="Minimum 6 characters"]', 'Password123!');
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL('http://localhost:5173/');

    // User A creates a shared board
    await pageA.click('button:has-text("Create Board")');
    await pageA.fill(
      'input[placeholder="e.g. Q4 Growth & Infrastructure Sprint"]',
      'Real-Time Live Collab Board'
    );
    await pageA.click('button[type="submit"]:has-text("Create Board")');
    await pageA.click('text=Real-Time Live Collab Board');
    await expect(pageA).toHaveURL(/.*\/boards\/.*/);

    const boardUrl = pageA.url();
    const boardId = boardUrl.split('/boards/')[1];

    // User B registers
    const userBEmail = `collabB_${Date.now()}@syncboard.dev`;
    await pageB.goto('http://localhost:5173/register');
    await pageB.fill('input[placeholder="Sarah Connor"]', 'Collaborator Beta');
    await pageB.fill('input[placeholder="sarah@cyberdyne.com"]', userBEmail);
    await pageB.fill('input[placeholder="Minimum 6 characters"]', 'Password123!');
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL('http://localhost:5173/');

    // User A invites User B to the board
    await pageA.click('button:has-text("Team")');
    await pageA.fill('input[placeholder="colleague@company.com"]', userBEmail);
    await pageA.click('button[type="submit"]:has-text("Invite")');
    await pageA.click('button:has-text("Close")');

    // User B navigates directly to the shared board URL
    await pageB.goto(boardUrl);
    await expect(pageB.locator('h1')).toContainText('Real-Time Live Collab Board');

    // Both users are now viewing the same live Kanban board!
    // User A creates a task
    await pageA.click('button:has-text("New Task")');
    await pageA.fill(
      'input[placeholder="e.g. Implement WebSocket reconnection handler"]',
      'Live WebSocket Synced Task'
    );
    await pageA.click('button[type="submit"]:has-text("Create Task")');

    // User B must receive and display this task in real-time WITHOUT refreshing the page!
    await expect(pageB.locator('h4:has-text("Live WebSocket Synced Task")')).toBeVisible({
      timeout: 10000,
    });

    await contextA.close();
    await contextB.close();
  });
});
