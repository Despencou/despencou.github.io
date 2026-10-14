const {test}=require('node:test'),assert=require('node:assert/strict');
const ml=require('../ml-coupon-tabs.js');
const source={id:'source',kind:'coupon',store:'Mercado Livre',source:'ml-coupon-page',code:'DUPLICADO',title:'20% desconto',discount_type:'percent',discount_value:20,min_purchase:149,max_discount:100,valid_from:'2026-10-14',valid_until:'2026-10-15'};
const old={...source,id:'old',code:'ANTIGO',valid_from:'2026-10-12',valid_until:'2026-10-14',discount_value:30,min_purchase:50,max_discount:300};
const telegram={id:'tg-1',kind:'coupon',store:'Mercado Livre',code:'DUPLICADO',published_at:'2026-10-14T20:00:00Z'};
const yesterday={...telegram,id:'tg-2',published_at:'2026-10-13T20:00:00Z'};
const first={...source,id:'first',title:'50% de desconto · Primeira compra',category:'Primeira compra',discount_value:50};
const items=[source,old,telegram,yesterday,first];
test('Brazilian calendar day is used around midnight',()=>{
 assert.equal(ml.day('2026-10-15T01:00:00Z'),'2026-10-14');assert.equal(ml.day('2026-10-15T04:00:00Z'),'2026-10-15');
});
test('Daily tab preserves same-code coupons from the page and Telegram and hides older Telegram posts',()=>{
 assert.deepEqual(ml.section(items,'today','2026-10-14').map(i=>i.id),['source','tg-1']);
 assert.deepEqual(ml.section(items,'expires','2026-10-14').map(i=>i.id),['old']);
 assert.deepEqual(ml.section(items,'all','2026-10-14').map(i=>i.id),['source','old']);
});
test('The three sort choices use percentage, minimum purchase and maximum discount separately',()=>{
 const cash={...source,id:'cash',discount_type:'reais',discount_value:500,max_discount:500,min_purchase:1000};
 const unknown={...source,id:'unknown',discount_value:null,title:'Cupom',min_purchase:null,max_discount:null};
 assert.deepEqual(ml.order([source,cash,old,unknown],'discount').map(i=>i.id),['old','source','cash','unknown']);
 assert.deepEqual(ml.order([source,cash,old,unknown],'minimum').map(i=>i.id),['old','source','cash','unknown']);
 assert.deepEqual(ml.order([source,cash,old,unknown],'maximum').map(i=>i.id),['cash','old','source','unknown']);
 assert.equal(new URL(ml.destination).searchParams.get('matt_tool'),'32116382');assert.equal(new URL(ml.destination).searchParams.get('forceInApp'),'true');
});
