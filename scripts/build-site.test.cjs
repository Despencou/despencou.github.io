const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {build,offerBody}=require('./build-site.cjs');
require('./payment-parser.test.cjs');
require('./ml-coupon-tabs.test.cjs');
test('Static product HTML includes only payment terms present in the post',()=>{
 const item={title:'Produto',price:187.34,store:'Mercado Livre',url:'https://meli.la/a',published_at:'2026-10-14',description:'por 187,34 em 6x sem juros'};
 assert.match(offerBody(item),/Em 6x sem juros/);
 assert.match(offerBody({...item,description:'por 187,34 no Pix'}),/No Pix/);
 assert.doesNotMatch(offerBody({...item,description:'por 187,34'}),/Em 6x|No Pix/);
});
test('Permanent HTML preserves ended offers, safe coupons, and excludes draft blog and test routes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'despencou-seo-')),out=path.join(root,'output');
 try{
  await fs.mkdir(path.join(root,'oferta'));await fs.mkdir(path.join(root,'content'));
  await fs.copyFile(path.join(__dirname,'../oferta/index.html'),path.join(root,'oferta/index.html'));
  await fs.writeFile(path.join(root,'content/articles.json'),JSON.stringify([{published:false,slug:'rascunho',title:'Draft',paragraphs:['Not ready']} ]));
  const ended={id:'tg-1',kind:'offer',title:'Produto <teste>',price:10,store:'Amazon',url:'https://amzn.to/a',description:'Use o cupom: VALEMAIS',published_at:'2020-01-01T00:00:00+00:00',image:'/site-images/tg-1.jpg'};
  const active={...ended,id:'tg-2',title:'Ativo'},bad={...ended,id:'tg-3',url:'https://amazon.com.br.evil.test/a'};
  const result=await build(root,out,{items:[ended,active,bad]},{items:[active]},false);
  const html=await fs.readFile(path.join(out,'oferta/tg-1/index.html'),'utf8');
  assert.match(html,/Oferta encerrada/);assert.match(html,/VALEMAIS/);assert.match(html,/Preço da publicação/);assert.match(html,/Produto &lt;teste&gt;/);assert.match(html,/content="index,follow"/);assert.match(html,/https:\/\/despencou.com\/oferta\/tg-1\//);assert.doesNotMatch(html,/@type":"Offer"|Condições da publicação/);
  assert.equal(result.map['tg-3'],undefined);
  const sitemap=await fs.readFile(path.join(out,'sitemap.xml'),'utf8');assert.match(sitemap,/\/oferta\/tg-1\//);assert.doesNotMatch(sitemap,/\/teste\/|rascunho|\/blog\//);
  assert.match(await fs.readFile(path.join(out,'blog/index.html'),'utf8'),/noindex,follow/);
  await fs.writeFile(path.join(root,'content/articles.json'),JSON.stringify([{published:true,slug:'guia-pronto',title:'Guia',description:'Dicas',author:'Despencou',published_at:'2026-10-14',paragraphs:['Artigo revisado.']} ]));
  await build(root,out,{items:[ended]},{items:[]},true);
  assert.match(await fs.readFile(path.join(out,'sitemap.xml'),'utf8'),/\/blog\/guia-pronto\//);
  assert.match(await fs.readFile(path.join(out,'blog/guia-pronto/index.html'),'utf8'),/Artigo revisado\.|BlogPosting/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Product-page instruction and Shopee redemption URL stay distinct from product URL',()=>{
 const item={title:'Produto',price:10,store:'Shopee',published_at:'2026-10-14',url:'https://s.shopee.com.br/produto',description:'Resgate o cupom\nhttps://s.shopee.com.br/cupom\nhttps://s.shopee.com.br/produto'};
 const html=offerBody(item);assert.match(html,/Resgatar cupom/);assert.match(html,/href="https:\/\/s.shopee.com.br\/cupom"/);assert.match(html,/href="https:\/\/s.shopee.com.br\/produto"/);
 const instruction=offerBody({...item,store:'Amazon',url:'https://amzn.to/a',description:'🎟️Resgate o cupom na página do produto (próximo ao preço), desconto na finalização.'});
 assert.match(instruction,/próximo ao preço/);assert.doesNotMatch(instruction,/data-copy-coupon/);
});


