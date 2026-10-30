import { test, expect } from '@playwright/test';
test('built app displays the supplied JSON without backend or fake calculations', async ({
  page,
}) => {
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiCalls.push(request.url());
  });
  await page.goto('http://127.0.0.1:5184/characters/138');
  await expect(page.getByTestId('stat-0').locator('strong')).toHaveText('1,100');
  await expect(page.getByText('※表示数値・本能・進化条件等は開発用サンプルです')).toHaveCount(0);
  expect(apiCalls).toEqual([]);
});
