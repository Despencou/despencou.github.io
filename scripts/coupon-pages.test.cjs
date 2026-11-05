const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pages=require('../coupon-pages.js'),renderer=require('./coupon-render.cjs');
const template=fs.readFileSync(path.join(__dirname,'../oferta/index.html'),'utf8');
const now=new Date('2026-11-05T15:00:00Z');
const ml={kind:'coupon',store:'Mercado Livre',id:'ml',source:'ml-coupon-page',title:'15% de desconto · Tecnologia',category:'Tecnologia',code:'TECH15',url:'https://meli.la/cupom',published_at:'2026-11-05T12:00:00Z',valid_from:'2026-11-05',valid_until:'2026-11-05',min_purchase:199,max_discount:50};
const shopee={...ml,id:'shopee',store:'Shopee',source:undefined,code:'72HPOEVB9O',title:'R$ 20 OFF em R$ 100 - 72HPOEVB9O',url:'https://s.shopee.com.br/resgate',valid_from:undefined,valid_until:undefined};
test('Coupon pages preserve store rules, expiration and Sao Paulo midnight',()=>{
 const telegram={...ml,id:'ml-telegram',source:undefined};
 const expired={...ml,id:'expired',valid_until:'2026-11-04'};
 const first={...ml,id:'first',discount_type:'percent',discount_value:50,category:'Primeira compra'};
 const unsafe={...ml,id:'unsafe',url:'javascript:alert(1)'};
 const feed=[ml,shopee,telegram,expired,first,unsafe];
 assert.deepEqual(pages.select(feed,'Mercado Livre','all','recent','2026-11-05').map(i=>i.id),['ml']);
 assert.equal(pages.select(feed,'Mercado Livre','expires','recent','2026-11-05').length,1);
 assert.equal(pages.select(feed,'Mercado Livre','all','recent','2026-11-06').length,0);
 for(const tab of ['today','all']){
  assert.equal(pages.select(feed,'Shopee',tab,'recent','2026-11-05').length,1);
  assert.equal(pages.select(feed,'Shopee',tab,'recent','2026-11-06').length,0);
 }
 assert.deepEqual(pages.select([{...shopee,published_at:'2026-11-06T02:59:59Z'}],'Shopee','today','recent','2026-11-05').map(i=>i.id),['shopee']);
 assert.equal(pages.select([{...shopee,published_at:'2026-11-06T03:00:00Z'}],'Shopee','today','recent','2026-11-05').length,0);
});
test('Copy and store links keep digit-first codes, affiliate destination and safe escaping',()=>{
 const html=pages.card({...shopee,code:null});
 assert.match(html,/data-coupon-code="72HPOEVB9O"/);assert.match(html,/Copiar e ir pra loja/);assert.match(html,/href="https:\/\/s.shopee.com.br\/resgate"/);assert.match(html,/cupom=72HPOEVB9O/);
 const imported=pages.card(ml);assert.match(imported,/matt_tool=32116382/);assert.match(imported,/Compra mínima:/);assert.match(imported,/>Tecnologia<\/p>/);assert.doesNotMatch(imported,/>15% de desconto ·/);
 assert.match(pages.card({...shopee,title:'<img src=x onerror=alert(1)>',code:'" onclick="x'}),/&lt;img/);
 assert.doesNotMatch(pages.card({...shopee,code:'" onclick="x'}),/data-coupon-code="" onclick/);
});
test('Central and three stores render indexable HTML, self canonical and meaningful fallback',()=>{
 const feed={items:[ml,shopee,{...ml,id:'older',code:'ANTERIOR',valid_from:'2026-11-04'}],updated_at:now.toISOString()};
 for(const store of ['', 'Mercado Livre','Shopee','Amazon']){
  const {html,url}=renderer.render(template,feed,store,now);
  assert.match(html,/content="index,follow"/);assert.ok(html.includes('rel="canonical" href="https://despencou.com'+url+'"'));
  assert.match(html,/<h1>/);assert.match(html,/CollectionPage/);assert.match(html,/href="\/cupons\/mercado-livre\/"/);assert.match(html,/href="\/cupons\/shopee\/"/);assert.match(html,/href="\/cupons\/amazon\/"/);
  assert.match(html,/entrar.despencou.com\/zaphome/);assert.match(html,/portal-tracker.js/);assert.match(html,/offer-profile.js/);
  assert.doesNotMatch(html,/src="\/(?:oferta|offer-community|payment-parser).js/);assert.doesNotMatch(html,/Carregando oferta/);
  const beforeScripts=html.split('<script id="coupon-page-data"')[0];
  if(store==='Mercado Livre'||!store)assert.match(beforeScripts,/TECH15/);
  if(store==='Mercado Livre'){assert.match(beforeScripts,/ANTERIOR/);assert.match(beforeScripts,/id="coupon-panel-all"[^>]* hidden/);}
  if(store==='Shopee'||!store)assert.match(beforeScripts,/72HPOEVB9O/);
  if(store==='Amazon')assert.match(beforeScripts,/Nenhum cupom disponível/);
  if(store==='Shopee'){assert.match(beforeScripts,/50ZpuvznP6/);assert.match(beforeScripts,/3VlGPvA29x/);assert.doesNotMatch(beforeScripts,/data-coupon-tab="expires"/);}
 }
 const malicious={...shopee,title:'</script><script>alert(1)</script>'};
 assert.doesNotMatch(renderer.render(template,{items:[malicious]},'Shopee',now).html,/<script>alert/);
});
