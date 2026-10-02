const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const runtime = process.env.QUOTE_ORDER_SCRIPT || path.join(__dirname, '../nd/js/quote_order_v210.js');
const html = fs.readFileSync(path.join(__dirname, 'fixtures/quote-checkout.html'), 'utf8');
const key = 'gaggum_quote_order_context_v177';

async function open(page, quote = true, detail = '') {
  await page.route('**/*', r => r.fulfill({body: html, contentType:'text/html'}));
  await page.goto('https://gaggum.co.kr/order/orderform.html');
  await page.evaluate(({key, quote, detail}) => {
    window.alerts = [];
    window.alert = text => window.alerts.push(text);
    window.receiptClicks = 0;
    window.bankClicks = 0;
    document.querySelector('#addr_paymethod1').addEventListener('click', () => {
      window.bankClicks++;
      const target = document.querySelector('#wrappingClone_cash');
      document.querySelectorAll('#wrappingOriginal > div').forEach(n => target.append(n));
    });
    for (const name of ['cashreceipt_regist','tax_request_regist']) {
      const control = document.querySelector(`input[name='${name}'][value='1']`);
      control.addEventListener('click', () => {
        window.receiptClicks++;
        const other = name === 'cashreceipt_regist' ? 'tax_request_regist' : 'cashreceipt_regist';
        document.querySelector(`input[name='${other}'][value='1']`).checked = false;
        control.closest('div').querySelector('input[type="text"], input:not([type])').setAttribute('fw-filter', 'isFill');
      });
    }
    window.CAFE24API = { getCartList: cb => cb(null, {carts:[]}) };
    window.fetch = async () => new Response(JSON.stringify({ok:true,data:{discountCode:null,discountAmount:0,expectedTotalAmount:100000}}));
    if (quote) sessionStorage.setItem(key, JSON.stringify({
      token:'AbCdEfGhIjKlMnOpQrStUvWx',quoteNo:'2026100201',items:[],createdAt:Date.now(),orderFormHandoffAt:Date.now(),orderSubmittedAt:0,
      deliveryAddress:{postcode:'12345',address1:'테스트 기본주소',address2:detail},
      expected:{itemAmount:100000,totalAmount:100000,shippingAmount:0,serviceFeeAmount:0,shippingMethod:'freight_collect',shippingPaymentMethod:'collect'}
    }));
  }, {key,quote,detail});
  await page.addScriptTag({path:runtime});
  if (quote) await page.waitForFunction(() => document.querySelector('.ndQuoteOrderBanner')?.textContent.includes('무통장'));
}
(async () => {
 const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE}: {})});
 let failed = 0;
 try {
  for (const mobile of [false,true]) {
   const context = await browser.newContext({viewport:mobile?{width:375,height:667}:{width:1440,height:900},isMobile:mobile});
   for (const [name, run] of [
    ['native card panel hidden before bank selection', async page => {
      await open(page);
      assert.equal(await page.locator('#wrappingClone_card').isVisible(),false);
      assert.equal(await page.locator('#addr_paymethod0').isDisabled(),true);
      assert.equal(await page.locator('#addr_paymethod1').isChecked(),false);
      assert.equal(await page.evaluate(()=>window.bankClicks),0);
    }],
    ['bank defaults receipt through native click and preserves tax choice', async page => {
      await open(page); await page.locator('#addr_paymethod1').check();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#cashreceipt_regist0').isChecked(),true);
      assert.equal(await page.locator('#cashreceipt_user_mobile').getAttribute('fw-filter'),'isFill');
      await page.locator('#tax_request_regist0').check();
      await page.evaluate(()=>document.body.append(document.createElement('div'))); await page.waitForTimeout(150);
      assert.equal(await page.locator('#tax_request_regist0').isChecked(),true);
      assert.equal(await page.locator('#cashreceipt_regist0').isChecked(),false);
      assert.equal(await page.locator('#tax_request_regist1').isDisabled(),true);
      assert.equal(await page.evaluate(()=>window.receiptClicks),2);
    }],
    ['typed detail survives recalculation, rerender and submit', async page => {
      await open(page); await page.locator('#addr_paymethod1').check();
      await page.locator('#raddr2').fill('3층 301호');
      await page.evaluate(()=>document.querySelector('#payment_total_order_sale_price_view').textContent='100,000 원'); await page.waitForTimeout(150);
      assert.equal(await page.locator('#raddr2').inputValue(),'3층 301호');
      await page.evaluate(()=>{const n=document.querySelector('#raddr2'); const clone=n.cloneNode(true); clone.value=''; n.replaceWith(clone);}); await page.waitForTimeout(150);
      assert.equal(await page.locator('#raddr2').inputValue(),'3층 301호');
      const allowed=await page.evaluate(()=>document.querySelector('form').dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true})));
      assert.equal(allowed,true); assert.equal(await page.locator('#raddr2').inputValue(),'3층 301호');
    }],
    ['prefilled detail can be edited', async page => {
      await open(page,true,'견적 주소'); await page.locator('#raddr2').fill('수정 주소');
      await page.evaluate(()=>document.body.append(document.createElement('div'))); await page.waitForTimeout(150);
      assert.equal(await page.locator('#raddr2').inputValue(),'수정 주소');
    }],
    ['missing receipt controls block submission', async page => {
      await open(page,true,'301호'); await page.locator('#addr_paymethod1').check();
      await page.evaluate(()=>document.querySelector('.receiptWrap').remove()); await page.waitForTimeout(150);
      const allowed=await page.evaluate(()=>document.querySelector('form').dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true})));
      assert.equal(allowed,false);
      assert.match((await page.evaluate(()=>window.alerts)).at(-1),/현금영수증|세금계산서/);
      assert.equal(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)).orderSubmittedAt,key),0);
    }],
    ['normal checkout preserves card and receipt controls', async page => {
      await open(page,false); await page.waitForTimeout(150);
      assert.equal(await page.locator('#wrappingClone_card').isVisible(),true);
      assert.equal(await page.locator('#addr_paymethod0').isChecked(),true);
      assert.equal(await page.locator('#addr_paymethod0').isDisabled(),false);
      assert.equal(await page.locator('#tax_request_regist1').isChecked(),true);
      assert.equal(await page.locator('#tax_request_regist1').isDisabled(),false);
    }],
   ]) {
    const page=await context.newPage();
    try {await run(page);console.log(`PASS ${mobile?'mobile':'desktop'}: ${name}`);}
    catch(e){failed++;console.error(`FAIL ${mobile?'mobile':'desktop'}: ${name}: ${e.stack}`);}
    finally {await page.close();}
   }
   await context.close();
  }
 } finally {await browser.close();}
 if(failed) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
