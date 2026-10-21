const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {build,offerBody}=require('./build-site.cjs');
require('./payment-parser.test.cjs');
require('./ml-coupon-tabs.test.cjs');
const blog=require('./blog-render.cjs');
test('Blog renderer keeps editorial text escaped and rejects unsafe link protocols',()=>{
 const post={title:'Guia <teste>',author:'Equipe',paragraphs:['<script>alert(1)</script>'],blocks:[{type:'section',title:'Resumo',source:{label:'Fonte',url:'javascript:alert(1)'}}]};
 assert.throws(()=>blog.articleBody(post,'16/10/2026'),/HTTPS/);
 for(const url of ['https://user:pass@example.com','https://example.com/\nfoo','data:text/html,x'])assert.throws(()=>blog.link(url));
 post.blocks=[];
 const html=blog.articleBody(post,'16/10/2026');assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
test('Creatine article publishes five products, selected store links and article-specific group links',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'despencou-blog-')),out=path.join(root,'output');
 try{
  await fs.mkdir(path.join(root,'oferta'));await fs.mkdir(path.join(root,'content'));
  await fs.copyFile(path.join(__dirname,'../oferta/index.html'),path.join(root,'oferta/index.html'));
  const articles=JSON.parse(await fs.readFile(path.join(__dirname,'../content/articles.json'),'utf8'));
  const post=articles.find(p=>p.slug==='melhores-creatinas-2026');assert.ok(post);
  await fs.writeFile(path.join(root,'content/articles.json'),JSON.stringify([post]));
  await build(root,out,{items:[]},{items:[]},true);
  const url='/blog/melhores-creatinas-2026/',html=await fs.readFile(path.join(out,url,'index.html'),'utf8');
  const products=post.blocks.find(b=>b.type==='products').items;
  assert.equal(products.length,5);assert.equal((html.match(/class="blog-product"/g)||[]).length,5);
  assert.equal(products.flatMap(p=>p.links).length,12);
  assert.deepEqual(products.filter(p=>p.links.some(l=>l.label==='Mercado Livre')).map(p=>p.name),['Creatina 100% Pura 250 g Growth','Creatina 100% Pura Dark Lab 1 kg','Creatina Soldiers Nutrition em pó 1 kg']);
  for(const p of products){assert.ok(html.includes(p.price_range));for(const l of p.links)assert.ok(html.includes('href="'+l.url+'" target="_blank" rel="sponsored noopener noreferrer"'));}
  assert.equal((html.match(/class="blog-product-photo"/g)||[]).length,5);
  assert.match(html,/class="blog-cover"/);assert.match(html,/fetchpriority="high"/);
  assert.match(html,/capa-preparo-creatina.webp/);assert.match(html,/og:image/);
  const coverAt=html.indexOf('class="blog-cover"'),introAt=html.indexOf('class="blog-lead"'),listAt=html.indexOf('class="blog-section blog-selection"'),useAt=html.indexOf('<h2>Como usar</h2>'),groupAt=html.indexOf('class="blog-group"');
  assert.ok(coverAt<introAt&&introAt<listAt&&listAt<useAt&&useAt<groupAt);
  assert.doesNotMatch(html,/<h2>Para que serve a creatina/);
  assert.ok(products.every(p=>!p.description));
  assert.doesNotMatch(html,/<div class="blog-product-details"><p>/);
  assert.match(html,/<title>Quais são as melhores creatinas de 2026\? Veja a lista\.<\/title>/);
  assert.doesNotMatch(html,/Antes de comprar, confira estes detalhes|Participação gratuita\. Preços e disponibilidade podem mudar/);
  assert.match(html,/<small>Participação gratuita<\/small>/);
  assert.match(html,/de outros produtos com cupons para economizar ainda mais/);
  assert.match(html,/content="index,follow"/);assert.match(html,/BlogPosting/);assert.match(html,/"@type":"Organization","name":"Equipe Despencou"/);
  assert.match(html,/href="\/blog.css\?v=creatinas-editorial-20261016"/);assert.doesNotMatch(html,/src="\/(oferta|coupon-parser|payment-parser).js/);
  assert.doesNotMatch(html,/zaphome|https:\/\/t.me\/despencou"|Carregando oferta/);
  assert.equal((html.match(/href="https:\/\/entrar.despencou.com\/blogcreatina"/g)||[]).length,3);
  assert.equal((html.match(/href="https:\/\/t.me\/\+YdlsNvv9AbBjZTgx"/g)||[]).length,4);
  assert.match(html,/portal-tracker.js/);assert.ok(html.includes('https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/'));
  assert.ok((await fs.readFile(path.join(out,'sitemap.xml'),'utf8')).includes('https://despencou.com'+url));
  assert.ok((await fs.readFile(path.join(out,'blog-posts.json'),'utf8')).includes(url));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
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



