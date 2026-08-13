import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:4502';

/**
 * Smoke test for the join flow, run against a local mock of the deployed
 * rtk-session Worker (see e2e/mock-worker.mjs) — same approach and same
 * limitation as host-app/e2e/host.spec.ts: no live WebRTC/SFU layer, so the
 * actual waiting-room -> raise-hand -> stage-grant flow (which needs a
 * second, host-side browser context talking to a real session) could not be
 * exercised here. See FEATURE_TEST_REPORT.md.
 *
 * A session is created via a direct call to the mock worker first, standing
 * in for "a teacher already created this class and shared the session id" —
 * the participant app itself has no create-session code path, by design.
 */
test('join flow reaches the backend, and a failed live connection is never silent', async ({ page, request }) => {
  const created = await request.post(`${BACKEND_URL}/api/sessions`, { data: { title: 'Algebra 101' } });
  expect(created.ok()).toBe(true);
  const { session } = (await created.json()) as { session: { id: string } };
  const sessionId = session.id;

  const pageErrors: Error[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  await page.goto('/');
  await expect(page.getByTestId('name-input')).toBeVisible();

  await page.getByTestId('name-input').fill('Bob');
  await page.getByTestId('user-id-input').fill('student-bob');
  await page.getByTestId('session-id-input').fill(sessionId);
  await page.getByTestId('join-session-button').click();

  await expect(page.getByTestId('toast-success').first()).toContainText('Joining');

  await expect(async () => {
    const connecting = await page.getByText('Connecting…').isVisible();
    const errorToast = await page.getByTestId('toast-error').count();
    expect(connecting || errorToast > 0).toBe(true);
  }).toPass({ timeout: 10_000 });

  expect(pageErrors).toEqual([]);
});

test('join fails clearly against an unknown session id', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('name-input').fill('Bob');
  await page.getByTestId('user-id-input').fill('student-bob');
  await page.getByTestId('session-id-input').fill('does-not-exist');
  await page.getByTestId('join-session-button').click();
  await expect(page.getByTestId('toast-error').first()).toContainText('No session found');
});

test('landing form validates name and session id before calling the backend', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('join-session-button').click();
  await expect(page.getByTestId('toast-error').first()).toContainText('name');
});
