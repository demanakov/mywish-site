import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';
const base = process.env.TEST_URL ?? 'http://localhost:3000';
const engine = process.env.TEST_BROWSER ?? "chromium";
const browser = await ({chromium, firefox, webkit}[engine]).launch();
const errors = [];
async function page(options={}) {
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:process.env.TEST_MOTION ?? 'reduce',...options});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base); await p.locator('#name').waitFor({state:'attached'});
  return p;
}
async function draft(p) { return p.evaluate(()=>JSON.parse(sessionStorage.getItem('mywish:draft:v1'))?.order); }
try {
  for(const width of [320,360,375,768,1024,1440]) {
    const p=await page({viewport:{width,height:900}});
    assert.match(await p.locator('.rf-summary').innerText(), /Дата не выбрана/);
    for(const route of ['/', '/halls']) {
      await p.goto(base+route);
      await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,15));}});
      const {clientWidth,scrollWidth}=await p.evaluate(()=>({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
      assert.ok(scrollWidth<=clientWidth,`${route} overflow at ${width}: ${scrollWidth}`);
    }
    if(width===320) {
      await p.goto(base);
      for(let month=0;month<12;month++) {
        await p.locator('.dp-calendar').scrollIntoViewIfNeeded();
        assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`month ${month} overflow`);
        if(month<11) await p.locator('.dp-calendar').getByRole('button',{name:'Следующий месяц'}).click();
      }
    }
    await p.close();
  }
  const p=await page();
  await p.locator('#name').fill('Проверка');
  await p.locator('#phone').fill('+7 (812) 345-67-89');
  await p.locator('#messenger').fill('https://t.me/test_user');
  await p.locator('#wish').fill('Тестовый черновик');
  await p.locator('.u-package-card[data-package="wow"] .u-chip').click();
  await p.waitForTimeout(1100);
  await p.locator('.u-day:not(:disabled)').first().click();
  const before=await draft(p);
  assert.equal(before.pkg,'wow'); assert.equal(before.pkgTouched,true); assert.equal(before.dateTouched,true);
  await p.goto(base+'/halls');
  await p.locator('.halls-card-book').first().click();
  await p.waitForURL('**/#packages');
  assert.equal(await p.locator('#name').inputValue(),'Проверка');
  assert.equal(await p.locator('#phone').inputValue(),'+7 (812) 345-67-89');
  assert.equal((await draft(p)).date,before.date);
  assert.equal((await draft(p)).pkg,'wow');
  await p.reload();
  await p.waitForFunction(() => document.querySelector("#name")?.value === "Проверка");
  assert.equal(await p.locator('#name').inputValue(),'Проверка');
  assert.equal(await p.locator('#consent').isChecked(),false);
  await p.locator('.u-package-card[data-package="happy"] .u-chip').click();
  await p.waitForTimeout(1300);
  await p.locator('.u-package-card[data-package="extra"] .u-chip').click();
  await p.waitForTimeout(1300);
  assert.ok(await p.locator('#price').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<160),'repeated #price scroll');
  await p.locator('#phone').fill('123');
  await p.locator('.rf-submit').click();
  assert.equal(await p.locator('#phone').getAttribute('aria-invalid'),'true');
  assert.equal(await p.locator('#phone-error').innerText(),'Введи полный номер с кодом страны');
  await p.locator('#phone').fill('+34 612 345 678');
  await p.locator('#consent').check();
  await p.locator('.rf-submit').click(); // Local UI demonstration only; CRM integration intentionally absent.
  await p.waitForTimeout(400);
  assert.equal(await p.locator('.rf-fields').getAttribute('inert'),'');
  await p.locator('#name').evaluate(e=>e.focus());
  assert.notEqual(await p.evaluate(()=>document.activeElement?.id),'name','hidden form must not receive focus');
  await p.getByRole('button',{name:'Изменить данные',exact:true}).click();
  assert.equal(await p.locator('#contact').getAttribute('data-done'),'false');
  await p.locator('.rf-reset').click();
  assert.equal(await p.locator('#name').inputValue(),'');
  await p.goto(base+'/halls');
  await p.locator('.halls-card-open').first().click();
  await p.locator('.halls-viewer-close').click();
  assert.equal(await p.locator('dialog[open]').count(),0);
  await p.close();
  const n=await page({javaScriptEnabled:false});
  assert.equal(await n.locator('.rf-submit').isDisabled(),true);
  assert.equal(await n.locator('form').getAttribute('method'),'post');
  assert.equal(await n.locator('.hero-gate').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  await n.close();
  const print=await page(); await print.emulateMedia({media:'print'});
  assert.equal(await print.locator('[data-reveal]').evaluateAll(es=>es.filter(e=>getComputedStyle(e).opacity==='0').length),0);
  for(const route of ['/privacy','/consent','/cookies','/requisites','/menu']) {
    const response=await print.goto(base+route);assert.equal(response.status(),200,route);
    assert.ok(await print.locator('h1').innerText());
  }
  assert.equal((await print.goto(base+'/missing-page')).status(),404);
  await print.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: 6 widths, 12 calendar months, draft navigation/reload, repeated anchor, field validation, success focus/edit, reset, viewer close, no-JS, print and public pages.');
} finally { await browser.close(); }
