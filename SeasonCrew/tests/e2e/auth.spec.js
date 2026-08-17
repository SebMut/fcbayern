import { test, expect } from '@playwright/test';

async function stubPublicServices(page){
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0',route=>route.fulfill({
    contentType:'application/javascript',
    body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null}),resetPasswordForEmail:async()=>({data:{},error:null}),updateUser:async()=>({data:{user:{}},error:null}),signUp:async()=>({data:{session:null,user:{id:'test-user'}},error:null})},rpc:async(name)=>({data:name==='sc_username_available'?true:null,error:null})})}`
  }));
  await page.route('https://api.github.com/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
}

test('login exposes a password reset flow without duplicate auth implementation',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#loginForm')).toBeVisible();
  await page.getByRole('button',{name:'Passwort vergessen?'}).click();
  await expect(page.locator('#forgotForm')).toBeVisible();
  await expect(page.locator('#signupForm')).toBeHidden();
  await page.locator('#forgotEmail').fill('test@example.de');
  await page.getByRole('button',{name:'← Zurück zum Login'}).click();
  await expect(page.locator('#loginForm')).toBeVisible();
});

test('recovery callback opens the new-password form',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html?recovery=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#recoveryForm')).toBeVisible();
  await expect(page.locator('#recoveryPassword')).toBeVisible();
  await expect(page.locator('#recoveryPasswordConfirm')).toBeVisible();
});


test('new crews can select another club and expose a custom club name',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#newGroupClub option[value="custom"]')).toHaveCount(1);
  await page.locator('#newGroupClub').evaluate(el=>{el.value='custom';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await expect(page.locator('#newGroupClubNameRow')).not.toHaveClass(/hidden/);
  await expect(page.locator('#newGroupClubName')).toHaveAttribute('placeholder','z. B. TSV Feldkirchen');
});


test('signup without a session asks the user to confirm the email address',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Account erstellen'}).first().click();
  await page.locator('#signupUsername').fill('TestUser27');
  await page.locator('#signupEmail').fill('new@example.de');
  await page.locator('#signupPassword').fill('VerySafe123!');
  await page.locator('#signupForm button[type="submit"]').click();
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#authStatus')).toContainText('Bitte bestätige jetzt deine E-Mail');
  await expect(page.locator('#authStatus')).toContainText('Danach wirst du zu SeasonCrew zurückgeleitet');
});
