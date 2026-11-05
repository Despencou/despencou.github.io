const {test}=require('node:test'),assert=require('node:assert/strict');
const related=require('./related-offers.cjs');
const base={kind:'offer',price:40,store:'Amazon',url:'https://amzn.to/produto',published_at:'2026-11-05T12:00:00Z',image:'/site-images/tg-1.jpg'};
const offer=(id,title,extra={})=>({...base,id:'tg-'+id,title,...extra});
function catalog(items){return related.index(items,Object.fromEntries(items.map(i=>[i.id,'/oferta/'+i.id+'/'])));}
test('Related offers prefer exact products, exclude self/ended/unsafe rows and deduplicate repeated titles',()=>{
 const source=offer(1,'Creatina Dux Nutrition 300g',{ended:true});
 const items=[source,offer(2,source.title),offer(3,source.title,{published_at:'2026-11-05T13:00:00Z'}),offer(4,'Creatina Max Titanium 300g'),offer(5,'Whey Dux Nutrition 300g'),offer(6,'Creatina Growth 250g',{ended:true}),offer(7,'Creatina Soldiers 1kg',{url:'https://evil.test/'}),offer(8,'Creatina Dark Lab 1kg',{price:0})];
 const result=related.select(source,catalog(items));
 assert.deepEqual(result.map(i=>i.id),['tg-3','tg-4']);
 assert.deepEqual(related.select(offer(3,source.title),catalog(items)).map(i=>i.id),['tg-2','tg-4']);
 assert.equal(related.index([offer(2,'Creatina')],{}).length,0);
});
test('Shared electronics brands do not mix phones, TVs, monitors and accessories',()=>{
 const items=[offer(1,'Samsung Galaxy A27 128GB'),offer(2,'Samsung Galaxy S26 256GB'),offer(3,'Smart TV Samsung QLED 55 4K'),offer(4,'Monitor Gamer Samsung 27 QLED'),offer(5,'Capa Samsung Galaxy S26 256GB'),offer(6,'Relógio Galaxy Watch 8'),offer(7,'Pulseira Galaxy Watch 8')];
 assert.deepEqual(related.select(items[0],catalog(items)).map(i=>i.id),['tg-2']);
 assert.deepEqual(related.select(items[2],catalog(items)),[]);
 assert.deepEqual(related.select(items[5],catalog(items)),[]);
});
test('Unknown products require meaningful overlapping words; empty results have no generic filler',()=>{
 const source=offer(1,'Produto Misterioso Azul');
 assert.deepEqual(related.select(source,catalog([offer(2,'Produto Genérico Vermelho'),offer(3,'Camiseta Misterioso Azul') ])),[]);
 assert.equal(related.render(source,[]),'');
 const html=related.render({...source,ended:true},[offer(2,'Creatina <img src=x onerror=alert(1)>')]);
 assert.match(html,/Alternativas para esta oferta encerrada/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/href="\/oferta\/tg-2\/"/);
});
test('Suggestions are limited to four and ties favor more recent publications',()=>{
 const items=Array.from({length:8},(_,i)=>offer(i+2,'Creatina Marca'+i,{published_at:`2026-11-05T${String(i+10).padStart(2,'0')}:00:00Z`}));
 assert.deepEqual(related.select(offer(1,'Creatina Marca'),catalog(items)).map(i=>i.id),['tg-9','tg-8','tg-7','tg-6']);
});

test('Bundles retain the main product type and food squeezes are not drinking bottles',()=>{
 const items=[offer(1,'Celular Samsung Galaxy S26 256GB + Galaxy Buds Core'),offer(2,'Samsung Galaxy Buds Core'),offer(3,'Celular Samsung Galaxy A37 256GB + Galaxy Buds Core'),offer(4,'Garrafa Térmica Stanley Flip 500ml'),offer(5,'Hemmer Mostarda Amarela Americana Squeeze 1kg'),offer(6,'Garrafa de Água Stanley 710ml')];
 assert.deepEqual(related.select(items[0],catalog(items)).map(i=>i.id),['tg-3']);
 assert.deepEqual(related.select(items[3],catalog(items)).map(i=>i.id),['tg-6']);
 const pans=[offer(10,'Jogo de Panelas 5 Peças'),offer(11,'Panela de Arroz Elétrica 5 Xícaras'),offer(12,'Jogo de Panelas 10 Peças')];
 assert.deepEqual(related.select(pans[0],catalog(pans)).map(i=>i.id),['tg-12']);
});
