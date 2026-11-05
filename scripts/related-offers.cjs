'use strict';
const coupons=require('../coupon-parser.js');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// Narrow product types prevent matching unrelated products by brand alone.
const families=[
 ['phone',/\b(?:smartphone|celular|iphone|moto g\w*|redmi|poco [a-z0-9]+|galaxy (?:s\d+|a\d+|m\d+|z fold|z flip))\b/],
 ['tablet',/\b(?:tablet|ipad|galaxy tab)\b/],['tv',/\b(?:tv|televisor|televisao)\b/],['monitor',/\bmonitor\b/],
 ['notebook',/\b(?:notebook|macbook|laptop)\b/],['watch',/\b(?:relogio|smartwatch|galaxy watch|apple watch)\b/],
 ['creatine',/\bcreatina\b/],['whey',/\bwhey\b/],['protein-bar',/\bbarras? de proteina\b/],
 ['shirt',/\b(?:camiseta|camisetas|camisa|camisas|regata|regatas)\b/],['pants',/\bcalcas?\b/],['shorts',/\b(?:shorts?|bermudas?)\b/],
 ['underwear',/\bcuecas?\b/],['socks',/\bmeias?\b/],['jacket',/\b(?:jaqueta|corta vento|moletom)\b/],
 ['sneakers',/\btenis\b/],['sandals',/\b(?:chinelo|sandalia)\b/],['backpack',/\bmochila\b/],
 ['air-conditioner',/\bar condicionado\b/],['fan',/\bventilador\b/],['air-cooler',/\bclimatizador\b/],
 ['fridge',/\b(?:geladeira|refrigerador)\b/],['washer',/\b(?:lavadora de roupas|lava e seca|maquina de lavar roupa)\b/],
 ['pressure-washer',/\b(?:lavadora de alta pressao|lavadora alta pressao)\b/],['vacuum',/\baspirador\b/],
 ['air-fryer',/\b(?:air fryer|airfryer|fritadeira)\b/],['microwave',/\bmicro ondas\b/],['blender',/\bliquidificador\b/],
 ['coffee-maker',/\bcafeteira\b/],['rice-cooker',/\bpanela de arroz\b/],['pressure-cooker',/\bpanela de pressao\b/],['pans',/\b(?:panelas?|frigideiras?|cacarolas?)\b/],
 ['bottle',/\b(?:garrafas?|squeezes?)\b/],['cup',/\b(?:copos?|canecas?)\b/],['container',/\bpotes?\b/],
 ['headphones',/\b(?:fones?|headset|earbuds|airpods|galaxy buds)\b/],['speaker',/\b(?:caixa de som|caixas de som|soundbar)\b/],
 ['controller',/\b(?:controle|dualsense|joystick)\b/],['console',/\b(?:console|playstation 5|ps5|xbox series|nintendo switch)\b/],
 ['mouse',/\bmouse\b/],['keyboard',/\bteclado\b/],['chair',/\bcadeira\b/],
 ['power-strip',/\b(?:filtro de linha|protetor de surtos)\b/],['flashlight',/\blanterna\b/],
 ['perfume',/\b(?:perfume|colonia|eau de toilette|eau de parfum)\b/],['sunscreen',/\bprotetor solar\b/],
 ['shampoo',/\bshampoo\b/],['conditioner',/\bcondicionador\b/],['deodorant',/\b(?:desodorante|antitranspirante)\b/],
 ['diaper',/\bfraldas?\b/],['wipes',/\blencos? umedecidos?\b/],['pet-food',/\bracao\b/]
];
const stop=new Set('de da do das dos e em com para por sem no na nos nas a o as os um uma kit kits pack conjunto unidades unidade pecas peca pares par cores cor tamanho masculino feminina feminino masculina infantil adulto adultos original oficial premium profissional pura puro 100 novo nova bivolt preto preta branco branca cinza'.split(' '));
function describe(title){
 const name=normalize(title),types=new Set(families.filter(([,r])=>r.test(name)).map(([id])=>id));
 // Accessories are a different intent from the main electronic product.
 const accessory=name.match(/\b(capa|pelicula|suporte|carregador|cabo|case|pulseira)\b/);
 if(accessory){for(const type of ['phone','watch','tablet','console'])if(types.delete(type))types.add(type+'-'+accessory[1]);}
 if(types.has('controller'))types.delete('console');
 if(types.has('rice-cooker')||types.has('pressure-cooker'))types.delete('pans');
 if(types.has('bottle')&&/\b(?:mostarda|ketchup|molho|maionese|chocolate|doce|cerveja|vinho|whisky|vodka)\b/.test(name))types.delete('bottle');
 // A phone + earbuds bundle remains a phone suggestion, rather than an earbuds suggestion.
 const primary=types.values().next().value;
 if(primary){types.clear();types.add(primary);}
 const words=new Set(name.split(' ').filter(w=>w.length>=3&&!stop.has(w)&&!/^\d+(?:g|kg|ml|gb|tb|w|v|hz)?$/.test(w)));
 return {name,types,words};
}
function index(items,map){
 const seen=new Set();return items.filter(i=>i&&i.kind==='offer'&&!i.ended&&/^tg-\d+$/.test(i.id||'')&&typeof i.title==='string'&&Number.isFinite(i.price)&&i.price>0&&Number.isFinite(Date.parse(i.published_at))&&coupons.safeRetailer(i.url)&&map[i.id]==='/oferta/'+i.id+'/'&&!seen.has(i.id)&&seen.add(i.id)).map(item=>({item,...describe(item.title)}));
}
function select(source,catalog,limit=4){
 const target=describe(source.title),ranked=[];
 for(const candidate of catalog){
  if(candidate.item.id===source.id)continue;
  const sameType=[...target.types].some(t=>candidate.types.has(t));
  const overlap=[...target.words].filter(w=>candidate.words.has(w));
  const coverage=overlap.length/Math.max(1,Math.min(target.words.size,candidate.words.size));
  if(!sameType){
   if(target.types.size||candidate.types.size)continue;
   if(overlap.length<3||coverage<0.7)continue;
  }
  const modelMatches=overlap.filter(w=>/[a-z]/.test(w)&&/\d/.test(w)).length;
  ranked.push({...candidate,score:(target.name===candidate.name?100:0)+(sameType?10:0)+modelMatches*5+coverage*4+overlap.length});
 }
 ranked.sort((a,b)=>b.score-a.score||Date.parse(b.item.published_at)-Date.parse(a.item.published_at));
 const names=new Set();return ranked.filter(c=>{if(names.has(c.name))return false;names.add(c.name);return true;}).slice(0,limit).map(c=>c.item);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
function render(source,items){
 if(!items.length)return '';
 return `<section class="related-offers" id="ofertas-relacionadas" aria-labelledby="related-title"><h2 id="related-title">${source.ended?'Alternativas para esta oferta encerrada':'Veja também estas ofertas'}</h2><p>Publicações do catálogo recente. Confira o preço e a disponibilidade na loja.</p><div class="related-offers-grid">${items.map(i=>`<article class="related-offer"><a class="related-offer-photo" href="/oferta/${esc(i.id)}/" tabindex="-1" aria-hidden="true">${/^\/site-images\/tg-\d+\.jpg$/.test(i.image||'')?`<img src="https://midia.despencou.com${esc(i.image)}" alt="" width="320" height="240" loading="lazy" decoding="async">`:'<span aria-hidden="true">🛍️</span>'}</a><div class="related-offer-content"><span class="related-offer-store">${esc(i.store)}</span><h3><a href="/oferta/${esc(i.id)}/">${esc(i.title)}</a></h3><span class="related-offer-price">${money(i.price)}</span><small>Preço da publicação</small><a class="btn related-offer-button" href="/oferta/${esc(i.id)}/">Ver oferta</a></div></article>`).join('')}</div></section>`;
}
module.exports={index,select,render};
