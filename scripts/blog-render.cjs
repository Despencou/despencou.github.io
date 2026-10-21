'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function link(value){
 if(typeof value!=='string'||/[\u0000-\u0020\u007f]/.test(value))throw Error('Invalid blog link');
 let u;try{u=new URL(value);}catch{throw Error('Invalid blog link');}
 if(u.protocol!=='https:'||u.username||u.password)throw Error('Blog links must use HTTPS without credentials');
 return esc(value);
}
function photo(p){
 if(!p.image)return '';
 if(!/^\/assets\/blog\/[a-z0-9/-]+\.webp$/.test(p.image))throw Error('Invalid blog product image');
 return `<figure class="blog-product-photo"><img src="${esc(p.image)}" alt="${esc(p.name)} — embalagem do produto" width="700" height="700" loading="lazy" decoding="async"></figure>`;
}
function cover(c){
 if(!c)return '';
 if(!/^\/assets\/blog\/[a-z0-9/-]+\.webp$/.test(c.src))throw Error('Invalid blog cover image');
 return `<figure class="blog-cover"><img src="${esc(c.src)}" alt="${esc(c.alt)}" width="1440" height="960" fetchpriority="high" decoding="async">${c.caption?`<figcaption>${esc(c.caption)}</figcaption>`:''}</figure>`;
}
function groupLinks(post){return (post.blocks||[]).find(b=>b.type==='group');}
function articleBody(post,date){
 let body=`<article class="blog-article${post.layout==='editorial'?' editorial':''}"><header class="blog-hero"><p class="blog-kicker">${esc(post.category||'Dicas do Despencou')}</p><h1>${esc(post.title)}</h1><p class="page-meta">Por ${esc(post.author)} · ${esc(date)}</p>${cover(post.cover)}${post.paragraphs.map(s=>`<p class="blog-lead">${esc(s)}</p>`).join('')}</header>`;
 for(const [i,b] of (post.blocks||[]).entries()){
  if(b.type==='section')body+=`<section class="blog-section"><h2>${esc(b.title)}</h2>${(b.paragraphs||[]).map(s=>`<p>${esc(s)}</p>`).join('')}${b.bullets?.length?`<ul>${b.bullets.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}${b.source?`<p class="blog-source">Fonte: <a href="${link(b.source.url)}" target="_blank" rel="noopener noreferrer">${esc(b.source.label)}</a>.</p>`:''}</section>`;
  else if(b.type==='products'){
   body+=`<section class="blog-section blog-selection"><h2>${esc(b.title)}</h2>${b.note?`<p class="blog-price-note">${esc(b.note)}</p>`:''}<div class="blog-products">`;
   for(const [n,p] of b.items.entries())body+=`<section class="blog-product" aria-labelledby="product-${i}-${n}"><div class="blog-number" aria-hidden="true">${n+1}</div><div class="blog-product-content"><h3 id="product-${i}-${n}">${esc(p.name)}</h3><div class="blog-product-layout">${photo(p)}<div class="blog-product-details">${p.description?`<p>${esc(p.description)}</p>`:''}${p.source&&post.layout!=='editorial'?`<p class="blog-source"><a href="${link(p.source.url)}" target="_blank" rel="noopener noreferrer">${esc(p.source.label)}</a></p>`:''}<p class="blog-price"><span>Preço de referência</span><strong>${esc(p.price_range)}</strong></p><div class="blog-store-links" aria-label="Onde comprar ${esc(p.name)}">${p.links.map(l=>`<a class="btn blog-shop" href="${link(l.url)}" target="_blank" rel="sponsored noopener noreferrer">${esc(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div></div></div></div></section>`;
   body+='</div>';
   if(post.layout==='editorial'&&b.items.some(p=>p.source))body+=`<details class="blog-references"><summary>Fontes das informações dos produtos</summary><ul>${b.items.filter(p=>p.source).map(p=>`<li><a href="${link(p.source.url)}" target="_blank" rel="noopener noreferrer">${esc(p.source.label)}</a></li>`).join('')}</ul></details>`;
   body+='</section>';

  }else if(b.type==='group')body+=`<aside class="blog-group"><p class="blog-kicker">Ofertas + cupons</p><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><div class="cta"><a class="btn wa big" href="${link(b.whatsapp)}" target="_blank" rel="noopener noreferrer">Entrar no WhatsApp</a><a class="btn tg big" href="${link(b.telegram)}" target="_blank" rel="noopener noreferrer">Entrar no Telegram</a></div><small>${esc(b.caption||"Participação gratuita")}</small></aside>`;
  else throw Error('Unsupported blog block: '+b.type);
 }
 return body+'<p class="blog-disclosure">Ao comprar pelos links deste artigo, podemos receber uma comissão, sem custo extra para você.</p><a class="blog-back" href="/blog/">← Ver todos os artigos</a></article>';
}
module.exports={articleBody,groupLinks,link};
