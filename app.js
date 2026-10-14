'use strict';
(() => {
  const API = 'https://midia.despencou.com';
  const WPP = 'https://chat.whatsapp.com/Fuf1CMjvycwK7P695VPTof?mode=wwt';
  let items = [], store = 'all', couponStore = 'all', order = 'recent', limit = 16, loaded = false;
  const $ = s => document.querySelector(s);
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  function element(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function safeRetailer(url) {
    try { const u = new URL(url); return u.protocol === 'https:' && ['shopee.com.br','amazon.com.br','amzn.to','mercadolivre.com.br','mercadolivre.com','meli.la','mercadolibre.com'].some(d => u.hostname === d || u.hostname.endsWith('.'+d)); } catch { return false; }
  }
  function link(label, url, cls='btn') { const a = element('a',cls,label); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; return a; }
  function age(stamp) {
    const minutes = Math.max(0, Math.floor((Date.now()-new Date(stamp))/60000));
    return minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : minutes < 1440 ? `há ${Math.floor(minutes/60)} h` : `há ${Math.floor(minutes/1440)} dia(s)`;
  }
  function offerCard(item) {
    const card=element('article','p');
    const photo=element('div','img');
    if (item.image && /^\/site-images\/tg-\d+\.jpg$/.test(item.image)) {
      const img=element('img');img.src=API+item.image;img.alt=item.title;img.loading='lazy';img.addEventListener('error',()=>{img.remove();photo.prepend(element('span',null,'🛍️'));});photo.append(img);
    } else photo.append(element('span',null,'🛍️'));
    if(item.discount>0&&item.discount<100)photo.append(element('span','off',`-${item.discount}%`));
    photo.append(element('span','st',item.store));card.append(photo,element('h3',null,item.title));
    const prices=element('div');prices.append(element('span','old',item.old_price?money(item.old_price):''),element('div','pr',money(item.price)));card.append(prices);
    const coupon=DespencouCoupons.parse(item);
    if(coupon.hasCoupon){const a=element('a','btn offer-link','Ver oferta e cupom');a.href='/oferta/?id='+encodeURIComponent(item.id);card.append(a);}else card.append(link('Ver oferta',item.url,'btn offer-link'));
    card.append(element('span','t',age(item.published_at)));
    return card;
  }
  function groupCard() {
    const c=element('div','feedcta');c.append(element('h3',null,'Receba isso antes de acabar'),element('div',null,'As ofertas mais quentes saem primeiro no grupo.'));
    const buttons=element('div','cta');buttons.append(link('WhatsApp',WPP,'btn wa'),link('Telegram','https://t.me/despencou','btn tg'));c.append(buttons);return c;
  }
  function renderOffers() {
    const query=normalize($('#product-search').value);
    const filtered=items.filter(i=>i.kind==='offer' && (store==='all'||i.store===store) && normalize(i.title+' '+i.description).includes(query));
    filtered.sort(order==='price' ? (a,b)=>a.price-b.price : (a,b)=>new Date(b.published_at)-new Date(a.published_at));
    const grid=$('#g1');grid.replaceChildren();
    filtered.slice(0,limit).forEach((i,n)=>{grid.append(offerCard(i));if(n===3)grid.append(groupCard());});
    if(loaded&&!filtered.length)grid.append(element('p','empty','Nenhuma oferta encontrada. Experimente outra busca ou loja.'));
    $('#load-more').hidden=filtered.length<=limit;
    if(loaded)$('#feed-status').textContent=`${filtered.length} oferta(s) recente(s) · Preços e estoque podem mudar; confirme na loja.`;
  }
  function couponCard(item) {
    const card=element('article','cp');
    const value=item.title.match(/\d+\s*%|R\$\s*[\d.,]+/);card.append(element('b',null,value?value[0]:'Cupom'));
    const body=element('div');body.append(element('strong',null,item.store),element('p','coupon-title',item.title),element('small',null,'Publicado '+age(item.published_at)+' · Confira a validade na loja'));
    const code=element('div','code');
    if(item.code){code.append(element('span',null,item.code));const btn=element('button',null,'Copiar');btn.type='button';btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(item.code);btn.textContent='Copiado!';setTimeout(()=>btn.textContent='Copiar',2000);}catch{btn.textContent='Selecione o código';}});code.append(btn);}else code.append(element('span',null,'Cupom no link'));
    code.append(link('Pegar',item.url,''));body.append(code);card.append(body);return card;
  }
  function renderCoupons() {
    const coupons=items.filter(i=>i.kind==='coupon');
    for(const [selector,data] of [['#home-coupons',coupons.slice(0,3)],['#coupon-list',coupons.filter(i=>couponStore==='all'||i.store===couponStore)]]){
      const target=$(selector);target.replaceChildren(...data.map(couponCard));
      if(loaded&&!data.length)target.append(element('p','empty','Ainda não há cupons recentes para esta loja. Acompanhe as novidades no Telegram.'));
    }
  }
  async function loadFeed() {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(API+'/site-feed',{signal:controller.signal});if(!response.ok)throw Error('Feed indisponível');const data=await response.json();
      if(!Array.isArray(data.items))throw Error('Dados inválidos');
      items=data.items.filter(i=>safeRetailer(i.url) && ['offer','coupon'].includes(i.kind) && typeof i.title==='string' && !isNaN(new Date(i.published_at)) && (i.kind==='coupon'||(Number.isFinite(i.price)&&i.price>0)));
      loaded=true;renderOffers();renderCoupons();
    }catch{
      $('#feed-status').textContent=loaded?'Não foi possível atualizar agora. Mostrando as últimas ofertas carregadas.':'Não foi possível carregar as ofertas agora. Tente novamente em instantes ou entre no Telegram.';
    }finally{clearTimeout(timeout);}
  }
  function route() {
    const tab=['cupons','blog'].includes(location.hash.slice(1))?location.hash.slice(1):'ofertas';
    $('#home-view').hidden=tab!=='ofertas';$('#coupon-view').hidden=tab!=='cupons';$('#blog-view').hidden=tab!=='blog';
    document.querySelectorAll('[data-tab]').forEach(a=>{a.classList.toggle('on',a.dataset.tab===tab);a.setAttribute('aria-current',a.dataset.tab===tab?'page':'false');});
  }
  document.querySelectorAll('[data-store]').forEach(b=>b.addEventListener('click',()=>{store=b.dataset.store;limit=16;document.querySelectorAll('[data-store]').forEach(x=>x.classList.toggle('on',x===b));renderOffers();}));
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{order=b.dataset.sort;document.querySelectorAll('[data-sort]').forEach(x=>x.classList.toggle('on',x===b));renderOffers();}));
  document.querySelectorAll('[data-coupon-store]').forEach(b=>b.addEventListener('click',()=>{couponStore=b.dataset.couponStore;document.querySelectorAll('[data-coupon-store]').forEach(x=>x.classList.toggle('on',x===b));renderCoupons();}));
  $('#product-search').addEventListener('input',()=>{limit=16;renderOffers();});$('#load-more').addEventListener('click',()=>{limit+=16;renderOffers();});
  window.addEventListener('hashchange',route);route();loadFeed();setInterval(()=>{if(!document.hidden)loadFeed();},60000);
})();

