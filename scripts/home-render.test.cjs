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
