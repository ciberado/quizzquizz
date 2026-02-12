import { test } from '@playwright/test';

/**
 * Debug test to see what's happening with the host app
 */

test('debug host app loading', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];
  
  // Capture console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    const text = `[ERROR] ${error.message}`;
    errors.push(text);
    console.error(text);
  });
  
  // Capture failed requests
  page.on('response', response => {
    if (response.status() >= 400) {
      const text = `[HTTP ${response.status()}] ${response.url()}`;
      errors.push(text);
      console.error(text);
    }
  });
  
  console.log('\n=== Loading http://localhost:3000/host ===\n');
  await page.goto('http://localhost:3000/host');
  
  // Wait a bit
  await page.waitForTimeout(3000);
  
  console.log('\n=== Page loaded, checking state ===\n');
  
  // Check if #app exists
  const appExists = await page.locator('#app').count();
  console.log(`#app element count: ${appExists}`);
  
  if (appExists > 0) {
    const isVisible = await page.locator('#app').isVisible();
    console.log(`#app is visible: ${isVisible}`);
    
    const innerHTML = await page.locator('#app').innerHTML();
    console.log(`#app innerHTML: ${innerHTML.substring(0, 200)}`);
  }
  
  // Log the page URL
  console.log(`Current URL: ${page.url()}`);
  
  // Log all errors
  console.log(`\n=== Total errors: ${errors.length} ===`);
  errors.forEach(err => console.error(err));
  
  console.log(`\n=== Console logs: ${logs.length} ===`);
  logs.slice(-10).forEach(log => console.log(log));
});
