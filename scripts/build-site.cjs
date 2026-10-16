'use strict';
// Build permanent HTML from the public archive; never reads bot credentials.
const fs=require('node:fs/promises'),path=require('node:path');
const coupons=require('../coupon-parser.js');
const payments=require('../payment-parser.js');
const blog=require('./blog-render.cjs');
const BASE='https://despencou.com',API='https://midia.despencou.com';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const date=s=>new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
const jsonScript=d=>JSON.stringify(d).replace(/</g,'\\u003c');
const arg=(key,def)=>{const n=process.argv.indexOf(key);return n<0?def:process.argv[n+1];};
async function source(file,url){if(file)return JSON.parse(await fs.readFile(file,'utf8'));const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Public feed unavailable: '+r.status);return r.json();}
function offerBody(item){
 const coupon=coupons.parse(item),ended=!!item.ended,payment=payments.label(item);
 const photo=/^\/site-images\/tg-\d+\.jpg$/.test(item.image||'')?`<img src="${API+item.image}" alt="${esc(item.title)}">`:'<span>🛍️</span>';
 let box='';
 if(coupon.hasCoupon){box=`<section class="offer-coupons" aria-label="Cupons e instruções"><h2>${ended?'Cupom da publicação (confira a validade)':'Cupom da oferta'}</h2>`;
 for(const code of coupon.codes)box+=`<div class="offer-coupon-code"><strong>${esc(code)}</strong><button type="button" data-copy-coupon="${esc(code)}">Copiar cupom</button></div>`;
 for(const text of coupon.instructions)box+=`<p class="offer-coupon-instruction">${esc(text)}</p>`;
 if(coupon.redeemUrl)box+=`<a class="btn redeem-coupon" href="${esc(coupon.redeemUrl)}" target="_blank" rel="sponsored noopener noreferrer">Resgatar cupom</a>`;
 box+='</section>';}
 return `<article class="offer-detail-card"><h1>${esc(item.title)}</h1><p class="offer-state ${ended?'ended':''}">${ended?'Oferta encerrada':'Oferta publicada recentemente'}</p>${ended?'<p class="muted">Esta oferta saiu do catálogo recente. Mantivemos os detalhes como histórico; o preço e o cupom abaixo podem não estar mais disponíveis. Confira a situação atual na loja.</p>':''}<div class="offer-detail-photo">${photo}</div>${box}<a class="btn wa offer-store-button" href="${esc(coupon.productUrl)}" target="_blank" rel="sponsored noopener noreferrer">${ended?'Ver produto na loja':'Ir à loja'}</a><div class="offer-detail-prices"><span class="muted">Preço da publicação</span>${item.old_price?`<span class="old">${money(item.old_price)}</span>`:''}<strong class="offer-detail-price">${money(item.price)}</strong>${payment?`<span class="muted">${esc(payment)}</span>`:''}</div><p class="offer-detail-store">Loja: ${esc(item.store)}</p><p class="muted">Publicado em ${date(item.published_at)}. Preços, estoque e cupons podem mudar. Confira as condições na loja antes de comprar.</p><a href="/">Ver ofertas recentes</a></article>`;
}
function shell(template,title,description,url,body,extra='',index=true){
 return template.replace(/<title>.*?<\/title>/,`<title>${esc(title)} | Despencou</title>`)
 .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description)}">`)
 .replace(/<meta name="robots" content="[^"]*">/,`<meta name="robots" content="${index?'index,follow':'noindex,follow'}">`)
 .replace('</head>',`<link rel="canonical" href="${BASE+url}"><meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${BASE+url}">${extra}</head>`)
 .replace(/<div id="offer-detail"[^>]*>[\s\S]*?<\/div><\/main>/,`<div id="offer-detail">${body}</div></main>`)
 .replace('portal-principal-20261014','arquivo-seo-20261014');
}
async function build(root,output,archive,feed,generatedOnly=false){
 if(!Array.isArray(archive.items)||!Array.isArray(feed.items))throw Error('Invalid feed; keep last deployment');
 await fs.mkdir(output,{recursive:true});
 if(!generatedOnly){for(const name of await fs.readdir(root)){
   if(['.git','.github','scripts','content','_site'].includes(name)||path.join(root,name)===output)continue;
   await fs.cp(path.join(root,name),path.join(output,name),{recursive:true});
 }}
 const template=await fs.readFile(path.join(root,'oferta/index.html'),'utf8');
 const links=['/','/sobre/','/faq/','/contato/','/privacidade/','/termos/'];
 const map={};
 const active=new Set(feed.items.filter(i=>i.kind==='offer').map(i=>i.id));
 async function write(file,text){const dest=path.join(output,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,text);}
 for(const original of archive.items){
  if(original.kind!=='offer'||!/^tg-\d+$/.test(original.id)||!original.title||!Number.isFinite(original.price)||original.price<=0||!coupons.safeRetailer(original.url)||isNaN(new Date(original.published_at)))continue;
  const item={...original,ended:!active.has(original.id)},url='/oferta/'+item.id+'/';map[item.id]=url;links.push(url);
  const desc=`${item.title} na ${item.store}. Preço registrado: ${money(item.price)}. ${item.ended?'Oferta encerrada; consulte a loja.':'Confira o produto e os cupons da publicação.'}`;
  const schema={'@context':'https://schema.org','@type':'WebPage',name:item.title,url:BASE+url,description:desc,datePublished:item.published_at};
  let html=shell(template,item.title,desc,url,offerBody(item),`<script type="application/ld+json">${jsonScript(schema)}</script>`);
  html=html.replace('<div id="offer-detail">',`<div id="offer-detail" data-offer-id="${item.id}">`);
  await write('oferta/'+item.id+'/index.html',html);
 }
 await write('site-page-map.json',JSON.stringify(map));
 const posts=JSON.parse(await fs.readFile(path.join(root,'content/articles.json'),'utf8'));
 const published=posts.filter(p=>p.published===true&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug||'')&&p.title&&p.description&&p.author&&!isNaN(new Date(p.published_at))&&new Date(p.published_at)<=new Date()&&Array.isArray(p.paragraphs)&&p.paragraphs.length&&p.paragraphs.every(s=>typeof s==='string'&&s.trim()));
 const blogLinks=[];
 for(const p of published){const url='/blog/'+p.slug+'/';links.push(url);blogLinks.push({title:p.title,description:p.description,url});
  const body=blog.articleBody(p,date(p.published_at));
  const schema={'@context':'https://schema.org','@type':'BlogPosting',...(p.cover?{image:[BASE+p.cover.src]}:{}),headline:p.title,description:p.description,datePublished:p.published_at,...(p.updated_at?{dateModified:p.updated_at}:{}),author:{'@type':p.author_type==='Organization'?'Organization':'Person',name:p.author},publisher:{'@type':'Organization',name:'Despencou',url:BASE},mainEntityOfPage:BASE+url};
  let html=shell(template,p.seo_title||p.title,p.description,url,body,`<link rel="stylesheet" href="/blog.css?v=creatinas-editorial-20261016">${p.cover?`<meta property="og:image" content="${BASE+esc(p.cover.src)}">`:''}<script type="application/ld+json">${jsonScript(schema)}</script>`).replace(/<script src="\/(?:oferta|coupon-parser|payment-parser).js[^>]*><\/script>/g,'').replace('<span>Detalhes da oferta</span>','<a href="/blog/">Blog</a>').replace('class="offer-detail-page"','class="offer-detail-page blog-page"');
  if(p.seo_title)html=html.replace(/<title>.*?<\/title>/,()=>`<title>${esc(p.seo_title)}</title>`);
  const group=blog.groupLinks(p);
  if(group){html=html.replaceAll('href="https://entrar.despencou.com/zaphome"',()=>`href="${blog.link(group.whatsapp)}"`).replaceAll('href="https://t.me/despencou"',()=>`href="${blog.link(group.telegram)}"`);}
  await write('blog/'+p.slug+'/index.html',html);
 }
 const blogBody=`<section class="institution-page"><h1>Dicas do blog</h1>${published.length?blogLinks.map(p=>`<article><h2><a href="${p.url}">${esc(p.title)}</a></h2><p>${esc(p.description)}</p></article>`).join(''):'<p>Em breve, dicas para escolher produtos e aproveitar descontos. Os artigos aparecerão aqui quando estiverem prontos.</p>'}</section>`;
 await write('blog/index.html',shell(template,'Dicas do blog','Dicas e guias de produtos do Despencou.','/blog/',blogBody,'',!!published.length).replace(/<script src="\/oferta.js[^>]*><\/script>/,'').replace('<span>Detalhes da oferta</span>','<span>Blog</span>'));
 if(published.length)links.push('/blog/');
 await write('blog-posts.json',JSON.stringify(blogLinks));
 await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${links.map(url=>`<url><loc>${BASE+url}</loc></url>`).join('')}</urlset>\n`);
 await write('robots.txt','User-agent: *\nAllow: /\n\nSitemap: https://despencou.com/sitemap.xml\n');
 await write('.nojekyll','');
 console.log(`Generated ${Object.keys(map).length} product pages and ${published.length} published articles.`);
 return {map,links};
}
module.exports={build,offerBody};
if(require.main===module)(async()=>{const root=path.resolve(__dirname,'..'),out=path.resolve(arg('--output',path.join(root,'_site')));await build(root,out,await source(arg('--archive',null),API+'/site-offers'),await source(arg('--feed',null),API+'/site-feed'),process.argv.includes('--generated-only'));})().catch(e=>{console.error(e.message);process.exit(1);});


