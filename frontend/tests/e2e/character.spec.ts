import { test, expect } from '@playwright/test';
import type { CharacterDetailDto } from '../../src/features/characters/api/characterDto';
import fixture from '../../src/features/characters/fixtures/kasajizou_character_detail_display_v3.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/characters/138', (route) => route.fulfill({ json: fixture }));
});

for (const width of [390, 1280]) {
  test(`JSON detail and controls ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => {
      errors.push(e.message);
      console.log('PAGE ERROR', e.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
    });
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/characters/138');
    await expect(
      page.getByRole('heading', { name: 'ウルトラかさじぞう', exact: true }),
    ).toBeVisible();
    for (const form of fixture.forms) {
      await page.getByRole('button', { name: `第${form.form_number}`, exact: true }).click();
      await expect(page.getByRole('heading', { name: form.form_name, exact: true })).toBeVisible();
      await expect(page.getByTestId('stat-0').locator('strong')).toHaveText(
        form.hp.toLocaleString('ja-JP'),
      );
      await expect(page.getByTestId('stat-1').locator('strong')).toHaveText(
        form.attack_power.toLocaleString('ja-JP'),
      );
      await page.getByRole('button', { name: '解説' }).click();
      await expect(page.getByRole('dialog')).toContainText(form.description_body.split('\n')[0]);
      await page.keyboard.press('Escape');
      for (const name of [
        ...form.effect_targets.map((t) => t.effect_target_name),
        ...form.effects.map((e) => e.effect_name),
        ...form.abilities.map((a) => a.ability_name),
      ]) {
        await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
      }
    }
    await page.getByLabel('キャラクターレベル').fill('60');
    await page.getByLabel('キャラクターレベル').press('Enter');
    await expect(page.getByTestId('stat-0').locator('strong')).toHaveText('14,080');
    await expect(page.getByTestId('stat-2').locator('strong')).toHaveText('1,567');
    await page.getByRole('button', { name: '基本体力アップを上げる', exact: true }).click();
    await expect(page.getByTestId('total-np')).toContainText('15');
    await expect(page.getByTestId('stat-0').locator('strong')).toHaveText('14,361.6');
    await page.getByRole('button', { name: '古代の呪い無効を上げる', exact: true }).click();
    await expect(page.getByTestId('total-np')).toContainText('115');
    await expect(
      page.getByRole('button', { name: '古代の呪い無効を上げる', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: '第1', exact: true }).click();
    await expect(page.getByRole('heading', { name: '本能', exact: true })).toBeVisible();
    await expect(page.getByLabel('基本体力アップのレベル')).toHaveText('1');
    await expect(page.getByTestId('total-np')).toContainText('115');
    await expect(page.getByRole('heading', { name: '超本能', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '第4', exact: true }).click();
    await expect(page.getByLabel('基本体力アップのレベル')).toHaveText('1');
    await page.getByRole('link', { name: '⚙ お宝設定', exact: true }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('link', { name: 'キャラクター詳細に戻る' }).click();
    await expect(page.getByLabel('キャラクターレベル')).toHaveValue('60');
    await expect(page.getByLabel('基本体力アップのレベル')).toHaveText('1');
    await page.getByRole('button', { name: 'メニュー', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'メインメニュー' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        page
          .locator('img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `../output/ui-verification/json-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('array order, null fields and missing images are handled without invented values', async ({
  page,
}) => {
  // テスト専用の応答。配布JSONは変更しない。
  const response: CharacterDetailDto = JSON.parse(JSON.stringify(fixture));
  response.character_short_name = '短縮名テスト';
  response.limited_name = '限定名テスト';
  response.collaboration_name = 'コラボ名テスト';
  response.forms = [response.forms[1], response.forms[0]];
  response.forms[1].image_url = 'missing/image.png';
  response.forms[1].hp = null;
  response.talents = null;
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('PAGE ERROR', e.message);
  });
  await page.route('**/api/characters/138', (route) =>
    route.request().resourceType() === 'fetch'
      ? route.fulfill({ json: response })
      : route.continue(),
  );
  await page.goto('/characters/138');
  await expect(page.locator('.form-selector button')).toHaveText(['第2', '第1']);
  await expect(page.getByRole('heading', { name: 'かさじぞう', exact: true })).toBeVisible();
  await expect(page.getByTestId('stat-0').locator('strong')).toHaveText('未提供');
  await expect(page.getByRole('heading', { name: '本能', exact: true })).toHaveCount(0);
  await expect(page.getByText('略称：短縮名テスト')).toBeVisible();
  await expect(page.getByText('限定：限定名テスト')).toBeVisible();
  await expect(page.getByText('コラボ：コラボ名テスト')).toBeVisible();
  await expect(page.locator('.portrait').getByRole('img')).toHaveAttribute(
    'aria-label',
    'かさじぞう：画像未提供',
  );
  expect(errors).toEqual([]);
});

test('本能・超本能の表示とレベルは形態切り替えで変わらない', async ({ page }) => {
  const response: CharacterDetailDto = JSON.parse(JSON.stringify(fixture));
  response.talents!.abilities![0].talent_type_name = '超本能';
  await page.route('**/api/characters/138', (route) =>
    route.request().resourceType() === 'fetch'
      ? route.fulfill({ json: response })
      : route.continue(),
  );
  await page.goto('/characters/138');
  await page.getByRole('button', { name: '古代の呪い無効を上げる', exact: true }).click();
  await page.getByRole('button', { name: '基本体力アップを上げる', exact: true }).click();
  for (const form of response.forms) {
    await page.getByRole('button', { name: `第${form.form_number}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: '本能', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '超本能', exact: true })).toBeVisible();
    await expect(page.getByLabel('古代の呪い無効のレベル')).toHaveText('1');
    await expect(page.getByLabel('基本体力アップのレベル')).toHaveText('1');
    await expect(page.getByTestId('total-np')).toContainText('15');
    await expect(page.getByTestId('ultra-total-np')).toContainText('100');
  }
});
