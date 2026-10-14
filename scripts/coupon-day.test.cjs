const {test}=require('node:test');
const assert=require('node:assert/strict');
const {day,storeSection}=require('../ml-coupon-tabs.js');
const before='2026-10-15T02:59:59.999Z',after='2026-10-15T03:00:00.000Z';
test('day changes at midnight in Brasilia, independent of visitor timezone',()=>{
 assert.equal(day(before),'2026-10-14');assert.equal(day(after),'2026-10-15');
});
for(const store of ['Mercado Livre','Shopee','Amazon'])test(store+' daily coupons disappear at midnight without replacing the feed',()=>{
 const items=[{id:'old',kind:'coupon',store,published_at:'2026-10-14T18:00:00Z'},
 {id:'next',kind:'coupon',store,published_at:after},
 {id:'product',kind:'offer',store,published_at:before}];
 assert.deepEqual(storeSection(items,store,'today',day(before)).map(i=>i.id),['old']);
 assert.deepEqual(storeSection(items,store,'today',day(after)).map(i=>i.id),['next']);
});
test('imported ML coupons use launch day; older valid coupons remain in all coupons',()=>{
 const items=[{id:'source',kind:'coupon',store:'Mercado Livre',source:'ml-coupon-page',valid_from:'2026-10-14',valid_until:'2026-10-20',published_at:after}];
 assert.equal(storeSection(items,'Mercado Livre','today',day(before)).length,1);
 assert.equal(storeSection(items,'Mercado Livre','today',day(after)).length,0);
 assert.equal(storeSection(items,'Mercado Livre','all',day(after)).length,1);
});
test('all coupons within Shopee and Amazon remain available after midnight',()=>{
 for(const store of ['Shopee','Amazon'])assert.equal(storeSection([{kind:'coupon',store,published_at:before}],store,'all',day(after)).length,1);
});
