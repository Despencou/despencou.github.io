'use strict';
const coupons=require('../coupon-parser.js'),payments=require('../payment-parser.js');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const age=(stamp,now)=>{const minutes=Math.max(0,Math.floor((now-new Date(stamp))/60000));return minutes<1?'agora':minutes<60?`há ${minutes} min`:minutes<1440?`há ${Math.floor(minutes/60)} h`:`há ${Math.floor(minutes/1440)} dia(s)`;};
function card(item,map,now){
 const url=map[item.id]||'/oferta/?id='+encodeURIComponent(item.id);
 const photo=/^\/site-images\/tg-\d+\.jpg$/.test(item.image||'')?`<img src="https://midia.despencou.com${item.image}" alt="${esc(item.title)}" loading="lazy">`:'<span>🛍️</span>';
 const payment=payments.label(item);
 return `<article class="p"><div class="img">${photo}${item.discount>0&&item.discount<100?`<span class="off">-${esc(item.discount)}%</span>`:''}<span class="st">${esc(item.store)}</span></div><h3>${esc(item.title)}</h3><div><span class="old">${item.old_price?money(item.old_price):''}</span><div class="pr">${money(item.price)}</div>${payment?`<div class="t">${esc(payment)}</div>`:''}</div><a class="btn offer-link" href="${esc(url)}">Ver oferta</a><div class="offer-card-community" data-community-offer="${esc(item.id)}"><button type="button" disabled aria-label="Curtir oferta">♡</button><a href="${esc(url)}#comentarios" aria-label="Ver comentários da oferta">💬</a></div><span class="t">${age(item.published_at,now)}</span></article>`;
}
const group='<div class="feedcta"><h3>Receba antes de acabar</h3><div>As ofertas mais quentes saem primeiro no grupo.</div><div class="cta"><a class="btn wa" href="https://entrar.despencou.com/zaphome" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="btn tg" href="https://t.me/despencou" target="_blank" rel="noopener noreferrer">Telegram</a></div></div>';
function blogCards(posts){return posts.map(p=>`<article class="post">${/^\/assets\/blog\/[a-z0-9/-]+\.(?:webp|png|svg)$/.test(p.image||'')?`<a class="blog-thumb" href="${esc(p.url)}" aria-label="${esc(p.title)}"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" decoding="async"></a>`:''}<div class="b"><h3><a href="${esc(p.url)}">${esc(p.title)}</a></h3><p class="t">${esc(p.description)}</p></div></article>`).join('');}
function render(template,feed,map,posts,now=new Date()){
 const offers=feed.items.filter(i=>i.kind==='offer'&&/^tg-\d+$/.test(i.id||'')&&typeof i.title==='string'&&coupons.safeRetailer(i.url)&&Number.isFinite(i.price)&&i.price>0&&Number.isFinite(Date.parse(i.published_at))).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
 const initial=offers.slice(0,16),cards=initial.map((item,n)=>card(item,map,now)+(n===3?group:'')).join('');
 const articles=posts.filter(p=>/^\/blog\/[a-z0-9-]+\/$/.test(p.url||''));
 let html=template.replace('<div class="grid" id="g1"></div>',()=>`<div class="grid" id="g1">${cards||'<p class="empty">Nenhuma oferta disponível agora. Acompanhe o grupo para receber as próximas.</p>'}</div>`)
  .replace('Carregando ofertas do Telegram…',()=>`Ofertas registradas na última atualização · Preços e estoque podem mudar; confirme na loja.`)
  .replace(/(<div class="blog" id="home-blog">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/main>)/,()=>`<div class="blog" id="home-blog">${blogCards(articles)}</div></div></main>`)
  .replace(/<div class="blog" id="blog-list">[\s\S]*?<\/div><\/section>/,()=>`<div class="blog" id="blog-list">${blogCards(articles)}</div></section>`)
  .replace('Em breve, dicas para escolher produtos e aproveitar descontos.','Dicas para escolher produtos e aproveitar descontos.')
  .replace('href="#blog">Ver blog','href="/blog/">Ver blog')
  .replace('./app.js?v=cupons-relevantes-20261104','./app.js?v=home-html-preview-20261105');
 const seed=JSON.stringify({items:initial,pageMap:Object.fromEntries(initial.filter(i=>map[i.id]).map(i=>[i.id,map[i.id]]))}).replace(/</g,'\\u003c');
 html=html.replace('<script src="./coupon-parser.js',()=>`<script id="home-initial-data" type="application/json">${seed}</script><script src="./coupon-parser.js`);
 return html;
}
module.exports={render};
