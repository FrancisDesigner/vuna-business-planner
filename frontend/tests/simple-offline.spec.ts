import { expect, test, type Page } from '@playwright/test';

const SAVE_GATE_MESSAGE = 'Upgrade to save this plan to your VunaBooks account. Simple Mode still works in your browser without backend saving.';
const PREMIUM_GATE_MESSAGE = 'Sign in or upgrade to generate your premium Break-Even PDF.';
const OFFLINE_GATE_MESSAGE = "Simple Mode still works here in your browser. Sign in when you're online to save your plan.";
const SIMPLE_PDF_SUCCESS_MESSAGE = 'Your Simple Mode PDF was generated in the browser and downloaded to your device.';

async function resetClientState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function goToSimpleRetailFlow(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start Free$/ }).first().click();
  await expect(page.getByText('Set up your small-business plan in a few clear steps')).toBeVisible();
  await page.getByTestId('business-type-retail').click();
}

async function completeRetailJourney(page: Page) {
  await page.getByTestId('simple-step1-description').fill('Roadside tomato stall');
  await page.getByTestId('simple-step1-location').fill('Kampala');
  await page.getByTestId('simple-step1-purpose-grow_the_business').click();
  await page.getByTestId('simple-step1-payment-mixed').click();
  await page.getByTestId('simple-step1-growth-25').click();
  await page.getByTestId('simple-step1-next').click();

  await expect(page.getByText('Add the costs and weekly numbers that make this business real')).toBeVisible();
  await page.getByTestId(/simple-step2-item-name-/).first().fill('Tomatoes');
  await page.getByTestId(/simple-step2-buying-price-/).first().fill('1000');
  await page.getByTestId(/simple-step2-selling-price-/).first().fill('1500');
  await page.getByTestId(/simple-step2-units-per-week-/).first().fill('40');
  await page.getByTestId('simple-step2-next').click();

  await expect(page.getByText('Review how your pricing mix behaves')).toBeVisible();
  await page.getByTestId('simple-step3-next').click();

  await expect(page.getByRole('heading', { name: 'What one sale is doing for you' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your safe take-home amount' })).toBeVisible();
}

test('Simple Mode stays backend-optional when Railway API traffic is blocked', async ({ page }) => {
  const pageErrors: Error[] = [];
  const backendRequests: string[] = [];

  await resetClientState(page);

  await page.route('**/api/**', async (route) => {
    backendRequests.push(route.request().url());
    await route.abort('failed');
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });

  await goToSimpleRetailFlow(page);
  await completeRetailJourney(page);

  await expect(page.getByTestId('simple-step4-save-hint')).toHaveText(SAVE_GATE_MESSAGE);
  await expect(page.getByTestId('simple-step4-premium-hint')).toHaveText(PREMIUM_GATE_MESSAGE);
  await expect(page.getByTestId('simple-step4-save-button')).toHaveText(/Upgrade to Save Plan/);
  await expect(page.getByTestId('simple-step4-download-simple-pdf')).toHaveText(/Download Simple PDF/);
  await expect(page.getByTestId('simple-step4-premium-pdf-button')).toHaveText(/Sign In for Premium PDF/);

  expect(backendRequests).toHaveLength(0);
  expect(pageErrors).toEqual([]);
});

test('Simple Mode keeps calculating and generating the Simple PDF after the network drops', async ({ context, page }) => {
  const pageErrors: Error[] = [];

  await resetClientState(page);

  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });

  await goToSimpleRetailFlow(page);
  await context.setOffline(true);
  await completeRetailJourney(page);

  await expect(page.getByTestId('simple-step4-save-hint')).toHaveText(OFFLINE_GATE_MESSAGE);
  await expect(page.getByTestId('simple-step4-premium-hint')).toHaveText(OFFLINE_GATE_MESSAGE);
  await expect(page.getByTestId('simple-step4-save-button')).toHaveText(/Go Online to Save Plan/);
  await expect(page.getByTestId('simple-step4-premium-pdf-button')).toHaveText(/Go Online for Premium PDF/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('simple-step4-download-simple-pdf').click();
  await downloadPromise;
  await expect(page.getByTestId('wizard-share-feedback')).toHaveText(SIMPLE_PDF_SUCCESS_MESSAGE);

  await page.getByTestId('simple-step4-save-button').click();
  await expect(page.getByTestId('wizard-share-feedback')).toHaveText(OFFLINE_GATE_MESSAGE);

  await page.getByTestId('simple-step4-premium-pdf-button').click();
  await expect(page.getByTestId('wizard-share-feedback')).toHaveText(OFFLINE_GATE_MESSAGE);

  expect(pageErrors).toEqual([]);
});

test('Simple Mode shows new purpose, cash-gap, and scenario framing in the browser flow', async ({ page }) => {
  await resetClientState(page);

  await goToSimpleRetailFlow(page);
  await completeRetailJourney(page);

  await expect(page.getByText('Will money actually be in your hands?')).toBeVisible();
  await expect(page.getByText('Goal: Grow the business')).toBeVisible();
  await expect(page.getByText('Some customers pay now and some later', { exact: true })).toBeVisible();
  await expect(page.getByText(/To grow sales by 25%/).first()).toBeVisible();

  await page.getByTestId('simple-step4-scenario-bad').click();
  await expect(page.getByText('Bad month cash in hand')).toBeVisible();
  await expect(page.getByText(/25% fewer sales/)).toBeVisible();
});

test('Simple Mode lets the user override detected currency for calculations', async ({ page }) => {
  await resetClientState(page);

  await page.goto('/');
  await page.getByTestId('planner-currency-select').first().selectOption('USD');
  await page.getByRole('button', { name: /^Start Free$/ }).first().click();
  await expect(page.getByTestId('planner-currency-select').first()).toHaveValue('USD');

  await page.getByTestId('business-type-retail').click();
  await completeRetailJourney(page);

  await expect(page.getByText('86,667 USD').first()).toBeVisible();
  await expect(page.getByText('69,333 USD').first()).toBeVisible();
});

test('Simple Mode supports ongoing agriculture gross-margin planning', async ({ page }) => {
  await resetClientState(page);

  await page.goto('/');
  await page.getByRole('button', { name: /^Start Free$/ }).first().click();
  await page.getByTestId('simple-step1-business-status-ongoing').click();
  await page.getByTestId('business-type-agriculture').click();
  await page.getByTestId('simple-step1-description').fill('Tomato farm');
  await page.getByTestId('simple-step1-location').fill('Wakiso');
  await page.getByTestId('simple-step1-next').click();

  await expect(page.getByText('Add the seasonal field costs that make this crop plan real')).toBeVisible();
  await page.getByTestId(/simple-step2-seedCosts-amount-/).first().fill('300000');
  await page.getByTestId(/simple-step2-fuelCosts-amount-/).first().fill('150000');
  await page.getByTestId(/simple-step2-protectionCosts-amount-/).first().fill('50000');
  await page.getByTestId('simple-step2-next').click();

  await expect(page.getByText('Enter expected harvest and selling price')).toBeVisible();
  await page.getByTestId('simple-step3-agriculture-yield').click();
  await page.keyboard.type('1000');
  await expect(page.getByTestId('simple-step3-agriculture-yield')).toHaveValue('1000');
  await page.getByTestId('simple-step3-agriculture-price').click();
  await page.keyboard.type('1200');
  await expect(page.getByTestId('simple-step3-agriculture-price')).toHaveValue('1,200');
  await page.getByTestId('simple-step3-agriculture-byproduct').click();
  await page.keyboard.type('100000');
  await expect(page.getByTestId('simple-step3-agriculture-byproduct')).toHaveValue('100,000');
  await expect(page.getByText(/gross margin of 800,000 UGX/i)).toBeVisible();
  await page.getByTestId('simple-step3-next').click();

  await expect(page.getByRole('heading', { name: 'Will this season leave enough margin?' })).toBeVisible();
  await expect(page.getByText('Season gross margin').first()).toBeVisible();
  await expect(page.getByText('800,000 UGX').first()).toBeVisible();
});
