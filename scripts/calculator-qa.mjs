import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4176';const b=await chromium.launch({channel:'chrome',headless:true});const report=[];
await mkdir('test-results/calculator',{recursive:true});
try{for(const [width,height]of [[1280,900],[477,844],[360,800]]){
const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
await p.clock.setFixedTime(new Date('2026-09-16T12:00:00+03:00'));
await p.route(/^https:\/\/mc\.yandex\./,r=>r.fulfill({status:200,body:''}));
await p.goto(base+'/halls/',{waitUntil:'domcontentloaded'});
await p.locator('.halls-card-book').first().click();await p.waitForURL('**/#packages');
assert.equal(await p.locator('#hall').inputValue(),'Фламинго');
await p.locator('#price').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);
const next=p.getByRole('button',{name:'Следующий месяц',exact:true});const prev=p.getByRole('button',{name:'Предыдущий месяц',exact:true});
for(let m=0;m<12;m++){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(m<11)await next.click();}
assert.equal(await next.isDisabled(),true);for(let m=0;m<8;m++)await prev.click();
await p.getByRole('button',{name:/^12 декабря/}).click();
if(width<1024){await p.locator('.dp-package').filter({hasText:'Вау'}).click();for(let i=0;i<3;i++)await p.getByRole('button',{name:'Больше часов'}).click();}
else{await p.locator('#price button.u-option').filter({hasText:'Вау'}).click();await p.getByRole('button',{name:'8 ч',exact:true}).click();}
const draft=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('mywish:draft:v1')).order);
assert.equal(draft.date,'2026-12-12');assert.equal(draft.pkg,'wow');assert.equal(draft.hours,8);assert.equal(draft.hoursTouched,true);
assert.match((await p.locator('.u-form-total').innerText()).replace(/\s/g,''),/172500/);
await p.locator('#price').scrollIntoViewIfNeeded();await p.waitForTimeout(1500);await p.screenshot({path:`test-results/calculator/${width}-december.png`});
report.push({width,height,months:12,selectedDate:draft.date,hall:draft.hall,package:draft.pkg,hours:8,total:172500});console.log('PASS calculator',width);await p.close();
}await writeFile('test-results/calculator/report.json',JSON.stringify(report,null,2));}finally{await b.close()}
