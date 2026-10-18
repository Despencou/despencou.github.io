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
test('Mercado Livre excludes Telegram coupons from every tab and the home',()=>{
 assert.deepEqual(ml.section(items,'today','2026-10-14').map(i=>i.id),['source']);
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

test('Home coupons include only today imported ML launches',()=>{
 const shopee={...telegram,id:'shopee-old',store:'Shopee',published_at:'2026-10-13T20:00:00Z'};
 const amazon={...telegram,id:'amazon-today',store:'Amazon'};
 const shopeeToday={...shopee,id:'shopee-today',published_at:telegram.published_at};
 const data=[shopee,old,yesterday,source,telegram,amazon,shopeeToday,first];
 assert.deepEqual(new Set(ml.homeSection(data,'2026-10-14').map(i=>i.id)),new Set(['source']));
 assert.deepEqual(ml.homeSection(data,'2026-10-15'),[]);
 const midnight={...telegram,id:'midnight',published_at:'2026-10-15T02:59:59Z'};
 assert.deepEqual(ml.homeSection([midnight],'2026-10-14').map(i=>i.id),[]);
 assert.deepEqual(ml.homeSection([midnight],'2026-10-15'),[]);
});
test('Home and Shopee tab share the exact daily-coupons affiliate destination',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const url="https://shopee.com.br/m/cupom-de-desconto?mmp_pid=an_18383820308&uls_trackid=56tagngk00jl&utm_campaign=id_4nuHsmrDJHB&utm_content=----&utm_medium=affiliates&utm_source=an_18383820308&utm_term=fpq999xi8yuy";
 assert.equal(ml.shopeeDailyDestination,url);
 assert.ok(html.includes('href="'+url.replaceAll('&','&amp;')+'"'));
 assert.ok(app.includes("link('Conferir cupons do dia',ML.shopeeDailyDestination"));
 assert.ok(app.includes('ML.homeSection(coupons)'));
 assert.ok(app.includes('today!==couponDay'));
 assert.doesNotMatch(app,/coupons\.filter\(i=>!ML\.telegram\(i\)\)\.slice\(0,3\)/);
});

test('Shopee coupons disappear from both tabs at midnight in Sao Paulo; Amazon keeps its existing all tab',()=>{
 const before={kind:'coupon',store:'Shopee',id:'last-minute',published_at:'2026-10-15T02:59:59Z'};
 const after={...before,id:'next-day',published_at:'2026-10-15T03:00:00Z'};
 const invalid={...before,id:'no-date',published_at:'invalid'};
 for(const tab of ['today','all']){
  assert.deepEqual(ml.storeSection([before,after,invalid],'Shopee',tab,'2026-10-14').map(i=>i.id),['last-minute']);
  assert.deepEqual(ml.storeSection([before,after,invalid],'Shopee',tab,'2026-10-15').map(i=>i.id),['next-day']);
 }
 const amazon={...before,store:'Amazon'};
 assert.equal(ml.storeSection([amazon],'Amazon','all','2026-10-15').length,1);
 assert.equal(ml.storeSection([amazon],'Amazon','today','2026-10-15').length,0);
});
