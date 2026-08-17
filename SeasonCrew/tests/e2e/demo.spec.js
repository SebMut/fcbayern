import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem('seasoncrew-customer-demo-v2'));
  await page.goto('/SeasonCrew/demo.html',{waitUntil:'domcontentloaded'});
});

test('admin can move an allocation and duplicate members stay blocked',async({page})=>{
  await page.locator('[data-action="change-assignment"][data-match="m2"][data-ticket="t1"]').click();
  await expect(page.locator('#assignDialog')).toHaveAttribute('open','');
  await page.locator('#assignSeat').selectOption('t3');
  await page.locator('#assignSaveBtn').click();
  await expect(page.locator('#toast')).toContainText('Zuweisung geändert');
  await expect(page.locator('.ticketCard').filter({has:page.locator('[data-action="change-assignment"][data-match="m2"][data-ticket="t3"]')})).toContainText('Alex');

  await page.locator('[data-action="assign"][data-match="m2"][data-ticket="t1"]').first().click();
  await expect(page.locator('#assignMember option[value="lea"]')).toHaveAttribute('disabled','');
  await page.locator('#assignGuest').fill('Lea');
  await page.locator('#assignSaveBtn').click();
  await expect(page.locator('#toast')).toContainText('ist Crew-Mitglied');
});

test('member view hides other peoples payment state',async({page})=>{
  await page.locator('#roleView').selectOption('guest');
  const chris=page.locator('.ticketCard').filter({hasText:'Chris'}).first();
  await expect(chris).toContainText('zugewiesen');
  await expect(chris).not.toContainText('Zahlung offen');
  await expect(chris).not.toContainText('55,00');
  const alex=page.locator('.ticketCard').filter({hasText:'Alex'}).first();
  await expect(alex).toContainText('bezahlt');
});
