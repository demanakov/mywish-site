import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const base=process.env.BASE_URL || "http://127.0.0.1:4176";
const output=process.env.QA_DIR || "test-results/integration";
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const report=[];
try {
 for(const [width,height] of [[1280,900],[477,844],[360,800]]) {
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
  await ctx.route(/^https:\/\/mc\.yandex\./,r=>r.fulfill({status:200,body:""}));
  const p=await ctx.newPage(); const errors=[]; const failed=[];
  p.on("pageerror",e=>errors.push(e.message));
  p.on("response",r=>{if(r.status()>=400&&r.url().startsWith(base)&&!r.url().includes("/api/leads.php"))failed.push([r.status(),r.url()]);});
  await p.route("**/api/leads.php",r=>r.fulfill({status:500,contentType:"application/json",body:'{"error":"Тест"}'}));
  await p.goto(base+"/?utm_source=ya_direct&utm_campaign=test&yclid=12345",{waitUntil:"domcontentloaded"});
  await p.locator(".rf-submit").waitFor();
  await p.waitForTimeout(1500);
  await p.screenshot({path:`${output}/${width}-hero.png`});
  assert.equal(await p.locator("form").count(),1);
  for(const id of ["halls","packages","price","contact","where"]) {
   await p.locator('#'+id).scrollIntoViewIfNeeded(); await p.waitForTimeout(1600);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`overflow ${width} ${id}`);
   if(["packages","price","contact"].includes(id)) await p.screenshot({path:`${output}/${width}-${id}.png`});
  }
  // All three deposit dialogs, including the mobile carousel's offscreen cards.
  const foodCount=3;
  for(let i=0;i<foodCount;i++) {
   let trigger;
   if(width<1024) {
    await p.locator('#pk-tab-'+i).click();
    await p.waitForTimeout(650);
    trigger=p.locator('#pk-card-'+i+' .u-food-trigger');
   } else trigger=p.locator('.u-food-trigger').nth(i);
   await trigger.click();
   const modal=p.locator('dialog.u-food-modal[open]'); await modal.waitFor();
   assert.ok(await modal.evaluate(e=>e.getBoundingClientRect().height>200));
   if(i===0) await p.screenshot({path:`${output}/${width}-deposit.png`});
   await modal.getByRole('button',{name:'Закрыть меню',exact:true}).click();
  }
  await p.locator('#name').fill('Тест'); await p.locator('#phone').fill('+7 (000) 000-00-00');
  await p.locator('#consent').check(); await p.locator('.rf-submit').click();
  await p.waitForFunction(()=>document.querySelector('.rf-status')?.textContent.includes('Не удалось'));
  assert.equal(await p.locator('.rf-success').getAttribute('data-shown'),'false');
  assert.equal(await p.locator('#name').inputValue(),'Тест');
  const requestId=await p.evaluate(()=>sessionStorage.getItem('mywish.main.request-id'));
  const requests=[];
  await p.unroute('**/api/leads.php');
  await p.route('**/api/leads.php',async r=>{requests.push(r.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,500));await r.fulfill({status:201,contentType:'application/json',body:'{"accepted":true,"leadNumber":42,"telegramDelivered":true,"amocrmDelivered":true}'});});
  await p.locator('.rf-submit').click();
  await p.locator('form').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await p.waitForFunction(()=>document.querySelector('.rf-success')?.getAttribute('data-shown')==='true');
  assert.equal(requests.length,1); assert.equal(requests[0].request_id,requestId);
  assert.equal(requests[0].yclid,'12345'); assert.equal(requests[0].consent,true);
  assert.equal(requests[0].form_id,'main_dmitry_request');
  assert.equal(requests[0].tariff,'help'); assert.equal(requests[0].event_date,'');
  assert.equal(requests[0].guests,0); assert.ok(requests[0].consented_at);
  await p.screenshot({path:`${output}/${width}-success.png`});
  for(const route of ['/halls/','/menu/','/privacy/','/consent/','/cookies/','/requisites/']) {
   const res=await p.goto(base+route,{waitUntil:'domcontentloaded'}); assert.equal(res.status(),200,route);
   assert.ok(await p.locator('h1').innerText());
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`overflow ${width} ${route}`);
  }
  assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
  report.push({width,height,foodDialogs:foodCount,requests:requests.length,errors,failed,status:'passed'});
  console.log('PASS',width,height,foodCount);
  await ctx.close();
 }
 await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
} finally {await browser.close();}
