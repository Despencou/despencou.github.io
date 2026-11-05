const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {render}=require('./home-render.cjs');
const template=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const offer={id:'tg-1',kind:'offer',title:'Produto',price:19.9,old_price:29.9,store:'Amazon',url:'https://amzn.to/produto',published_at:'2026-11-05T12:00:00Z',description:'Por R$ 19,90 no Pix',image:'/site-images/tg-1.jpg'};
const post={url:'/blog/artigo-publicado/',title:'Artigo publicado',description:'Guia para comprar.',image:'/assets/blog/creatinas-2026/capa-preparo-creatina.webp'};
test('Home HTML contains 16 permanent offer links and real article cards before JavaScript',()=>{
 const items=Array.from({length:20},(_,i)=>({...offer,id:'tg-'+(i+1)}));
 const map=Object.fromEntries(items.map(i=>[i.id,'/oferta/'+i.id+'/']));
 const html=render(template,{items},map,[post],new Date('2026-11-05T13:00:00Z'));
 const beforeScripts=html.split('<script id="home-initial-data"')[0];
 assert.equal((beforeScripts.match(/class="btn offer-link"/g)||[]).length,16);
 assert.equal((beforeScripts.match(/class="feedcta"/g)||[]).length,1);
 assert.match(beforeScripts,/href="\/oferta\/tg-1\/"/);assert.match(beforeScripts,/No Pix/);
 assert.match(beforeScripts,/href="\/blog\/artigo-publicado\/"/);assert.match(beforeScripts,/href="\/blog\/">Ver blog/);
 assert.doesNotMatch(html,/Em breve|Carregando ofertas do Telegram/);
 const data=JSON.parse(html.match(/<script id="home-initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.items.length,16);assert.equal(data.pageMap['tg-1'],'/oferta/tg-1/');
});
test('Initial home data excludes unsafe offers and escapes text and script delimiters',()=>{
 const malicious={...offer,title:'</script><script>alert(1)</script>',description:'<img src=x onerror=alert(1)>'};
 const html=render(template,{items:[malicious,{...offer,id:'bad-id'},{...offer,id:'tg-2',url:'https://evil.test/'}]},{'tg-1':'/oferta/tg-1/'},[post]);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);
 assert.equal((html.match(/class="btn offer-link"/g)||[]).length,1);
 const data=html.match(/<script id="home-initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
 assert.doesNotMatch(data,/<img|<script/);assert.equal(JSON.parse(data).items[0].title,malicious.title);
});
test('Empty home shows an honest state and keeps existing navigation and group destinations',()=>{
 const html=render(template,{items:[]},{},[]);
 assert.match(html,/Nenhuma oferta disponível agora/);assert.match(html,/href="\/cupons\/"/);
 assert.match(html,/entrar.despencou.com\/zaphome/);assert.doesNotMatch(html,/Em breve/);
 assert.equal((html.match(/class="btn offer-link"/g)||[]).length,0);
});

test('Catalog pages contain distinct offers, self canonical and crawlable links',()=>{
 const items=Array.from({length:35},(_,i)=>({...offer,id:'tg-'+(i+1)}));
 const map=Object.fromEntries(items.map(i=>[i.id,'/oferta/'+i.id+'/']));
 const html=render(template,{items},map,[post],new Date(),2);
 const data=JSON.parse(html.match(/<script id="home-initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.page,2);assert.deepEqual(data.items.map(i=>i.id),items.slice(16,32).map(i=>i.id));
 assert.match(html,/<link rel="canonical" href="https:\/\/despencou.com\/ofertas\/pagina\/2\/">/);
 assert.match(html,/href="\/#catalog-start" rel="prev"/);assert.match(html,/href="\/ofertas\/pagina\/3\/#catalog-start" rel="next"/);
 assert.doesNotMatch(html,/(src|href)="\.\//);
 assert.equal((html.match(/class="btn offer-link"/g)||[]).length,16);
 const last=render(template,{items},map,[],new Date(),3);
 assert.equal((last.match(/class="btn offer-link"/g)||[]).length,3);
 assert.throws(()=>render(template,{items},map,[],new Date(),4),/Invalid catalog page/);
});
test('Pagination counts only complete valid offer rows and skips appended pages for next',()=>{
 const p=require('../catalog-pagination.js');
 assert.equal(p.count(0),1);assert.equal(p.count(16),1);assert.equal(p.count(17),2);assert.equal(p.url(1),'/');
 assert.equal(p.render(16),'');
 assert.match(p.render(100,2,32),/pagina\/4\/#catalog-start" rel="next"/);
 assert.doesNotMatch(p.render(100,7),/rel="next"/);
 assert.match(p.render(1600,50),/pagination-gap/);
});

test('Build emits exactly all catalog pages and includes them in sitemap',async()=>{
 const root=await fs.promises.mkdtemp(require('node:os').tmpdir()+'/catalog-pages-'),out=path.join(root,'out');
 try{
  await fs.promises.mkdir(path.join(root,'oferta'));await fs.promises.mkdir(path.join(root,'content'));
  await fs.promises.copyFile(path.join(__dirname,'../oferta/index.html'),path.join(root,'oferta/index.html'));
  await fs.promises.writeFile(path.join(root,'index.html'),template);await fs.promises.writeFile(path.join(root,'content/articles.json'),'[]');
  const items=Array.from({length:35},(_,i)=>({...offer,id:'tg-'+(i+1)}));
  const {build}=require('./build-site.cjs');await build(root,out,{items},{items},true);
  const sitemap=await fs.promises.readFile(path.join(out,'sitemap.xml'),'utf8');
  assert.match(sitemap,/https:\/\/despencou.com\/ofertas\/pagina\/2\//);
  assert.match(sitemap,/https:\/\/despencou.com\/ofertas\/pagina\/3\//);
  assert.doesNotMatch(sitemap,/ofertas\/pagina\/(?:1|4)\//);
  assert.equal((await fs.promises.readFile(path.join(out,'ofertas/pagina/3/index.html'),'utf8')).match(/class="btn offer-link"/g).length,3);
 }finally{await fs.promises.rm(root,{recursive:true,force:true});}
});
