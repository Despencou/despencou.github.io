'use strict';
(function(root){
  const ML=typeof module!=='undefined'&&module.exports?require('./ml-coupon-tabs.js'):root.DespencouMLCoupons;
  const coupons=typeof module!=='undefined'&&module.exports?require('./coupon-parser.js'):root.DespencouCoupons;
  const stores=[['Mercado Livre','mercado-livre'],['Shopee','shopee'],['Amazon','amazon']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s.split('-').reverse().join('/'):'';
  function valid(items,today=ML.day()){
    return items.filter(i=>i&&i.kind==='coupon'&&stores.some(([name])=>name===i.store)&&typeof i.title==='string'&&coupons.safeRetailer(i.url)&&Number.isFinite(Date.parse(i.published_at))&&!ML.telegram(i)&&!ML.removed(i)&&(!i.valid_until||i.valid_until>=today)&&(!i.valid_from||i.valid_from<=today));
  }
  function select(items,store,tab='today',order='recent',today=ML.day()){
    const filtered=ML.storeSection(valid(items,today),store,tab,today);
    return ML.order(filtered,store==='Mercado Livre'&&tab==='all'?order:'recent');
  }
  function code(item){return /^[A-Za-z0-9_-]{2,40}$/.test(item.code||'')?item.code:(item.store==='Shopee'?item.title.match(/[-–:]\s*((?=[A-Z0-9_-]*[A-Z])[A-Z0-9][A-Z0-9_-]{3,29})\s*$/)?.[1]||'':'');}
  function card(item){
    const imported=ML.imported(item),value=item.title.match(/\d+\s*%|R\$\s*[\d.,]+/),coupon=code(item);
    const destination=item.store==='Mercado Livre'?ML.destination:item.url;
    const terms=[];
    if(imported){
      if(Number.isFinite(item.min_purchase)&&item.min_purchase>0)terms.push('Compra mínima: '+money(item.min_purchase));
      if(Number.isFinite(item.max_discount)&&item.max_discount>0)terms.push('Desconto máximo: '+money(item.max_discount));
      if(date(item.valid_until))terms.push('Válido até '+date(item.valid_until));
    }else terms.push('Publicado em '+date(ML.day(item.published_at)));
    const offers=coupon?'/?'+new URLSearchParams({cupom:coupons.normalizeCode(coupon),loja:item.store})+'#ofertas':'';
    return `<article class="cp"><b>${esc(value?.[0]||'Cupom')}</b><div><strong>${esc(item.store)}</strong><p class="coupon-title">${esc(imported?ML.categoryLabel(item):item.title)}</p><small>${esc(terms.join(' · '))}</small><small>${imported?'Pode esgotar antes da validade. Confira as condições na loja.':'🔥 Acaba rápido'}</small><div class="code"><span class="coupon-value">${esc(coupon||(imported?'Sem código · confira na loja':'Cupom no link'))}</span><a class="coupon-combined" href="${esc(destination)}" rel="sponsored noopener noreferrer"${coupon?` data-coupon-code="${esc(coupon)}"`:''}>${coupon?'Copiar e ir pra loja':'Ir pra loja'}</a></div><small class="coupon-copy-status" role="status"></small>${offers?`<a class="coupon-offers-link" href="${esc(offers)}">Ofertas publicadas com esse cupom</a>`:''}</div></article>`;
  }
  function dailyHighlight(){return `<a href="${esc(ML.shopeeDailyDestination)}" rel="sponsored noopener noreferrer"><strong>Confira os cupons do dia na Shopee</strong><span>Conferir cupons →</span></a>`;}
  function highlights(){return `<div class="coupon-highlights">${dailyHighlight()}<a href="https://s.shopee.com.br/50ZpuvznP6" rel="sponsored noopener noreferrer"><strong>CUPOM DE TECNOLOGIA</strong><span>Ver cupom de tecnologia →</span></a><a href="https://s.shopee.com.br/3VlGPvA29x" rel="sponsored noopener noreferrer"><strong>OFERTAS RELÂMPAGO NA SHOPEE</strong><span>Ver ofertas relâmpago →</span></a></div>`;}
  function nav(store){return `<nav class="coupon-store-links" aria-label="Cupons por loja">${stores.map(([name,slug])=>`<a class="chip${name===store?' on':''}" href="/cupons/${slug}/"${name===store?' aria-current="page"':''}>${name}</a>`).join('')}</nav>`;}
  function group(){return '<aside class="coupon-group-callout"><div><strong>Receba os cupons na hora no nosso grupo</strong><p>Entre grátis e acompanhe os novos cupons assim que forem publicados.</p></div><div class="cta"><a class="btn wa" href="https://entrar.despencou.com/zaphome" target="_blank" rel="noopener noreferrer">Entrar no WhatsApp</a><a class="btn tg" href="https://t.me/despencou" target="_blank" rel="noopener noreferrer">Entrar no Telegram</a></div></aside>';}
  function preview(items,today){return stores.map(([store,slug])=>{const shown=select(items,store,'today','recent',today).slice(0,3);return `<section class="coupon-preview"><h2><a href="/cupons/${slug}/">Cupons ${store} de hoje</a></h2>${store==='Shopee'?`<div class="coupon-highlights">${dailyHighlight()}</div>`:''}<div class="cps">${shown.length?shown.map(card).join(''):'<p class="coupon-empty">Nenhum cupom novo publicado hoje por aqui.</p>'}</div><p><a class="coupon-inline" href="/cupons/${slug}/#todos-os-cupons">Ver todos os cupons ${store==='Mercado Livre'?'do':'da'} ${store} disponíveis</a></p></section>`;}).join('');}
  function listing(items,store,tab='today',order='recent',today=ML.day()){
    const shown=select(items,store,tab,order,today);
    return {count:shown.length,html:shown.length?shown.map(card).join(''):'<p class="coupon-empty">Nenhum cupom disponível nesta aba agora. Acompanhe o grupo para receber os próximos.</p>'};
  }
  function panels(items,store,tab='today',order='recent',today=ML.day()){
    return (store==='Mercado Livre'?['today','expires','all']:['today','all']).map(t=>`<section id="coupon-panel-${t}" class="cps" aria-label="${t==='today'?'Saiu hoje':t==='expires'?'Esgota hoje':'Todos os cupons'}"${t!==tab?' hidden':''}>${listing(items,store,t,order,today).html}</section>`).join('');
  }
  const api={stores,esc,valid,select,code,card,highlights,nav,group,preview,listing,panels};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.DespencouCouponPages=api;
  const page=document.querySelector('[data-coupon-page]');if(!page)return;
  const requestedTab=()=>location.hash==='#todos-os-cupons'?'all':location.hash==='#esgota-hoje'?'expires':'today';
  let items=[],tab=requestedTab(),order='recent',stamp='',day=ML.day();
  const store=page.dataset.couponPage;
  try{const seed=JSON.parse(document.getElementById('coupon-page-data').textContent);items=seed.items;stamp=seed.updated_at||'';}catch{}
  function render(){
    day=ML.day();
    if(store){const result=listing(items,store,tab,order,day);document.getElementById('coupon-page-list').innerHTML=panels(items,store,tab,order,day);document.getElementById('coupon-page-count').textContent=result.count+' cupom(ns)'+(tab==='today'?' · Lançados hoje e publicados hoje no grupo':tab==='expires'?' · Com validade até hoje':'');
      document.querySelectorAll('[data-coupon-tab]').forEach(b=>{const on=b.dataset.couponTab===tab;b.setAttribute('aria-pressed',String(on));});
      document.getElementById('coupon-page-order').hidden=store!=='Mercado Livre'||tab!=='all';
      document.getElementById('coupon-sort-note').hidden=store!=='Mercado Livre'||tab!=='all'||order!=='discount';
    }else document.getElementById('coupon-page-preview').innerHTML=preview(items,day);
    const update=document.getElementById('coupon-page-updated');
    if(Number.isFinite(Date.parse(stamp))){update.textContent='Dados atualizados em '+new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(stamp))+' (Brasília). Validade sujeita às regras da loja.';}
  }
  async function refresh(){
    try{const r=await fetch('https://midia.despencou.com/site-feed',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const feed=await r.json();if(!Array.isArray(feed.items))throw Error();items=valid(feed.items);stamp=feed.updated_at||'';render();document.getElementById('coupon-page-feedback').textContent='';}
    catch{render();document.getElementById('coupon-page-feedback').textContent='Não foi possível atualizar agora. Confira os dados e a validade na loja.';}
  }
  document.querySelectorAll('[data-coupon-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.couponTab;history.replaceState(null,'',tab==='all'?'#todos-os-cupons':tab==='expires'?'#esgota-hoje':'#saiu-hoje');render();}));
  window.addEventListener('hashchange',()=>{tab=requestedTab();render();});
  document.getElementById('coupon-page-sort')?.addEventListener('change',e=>{order=e.target.value;render();});
  page.addEventListener('click',async e=>{
    const action=e.target.closest('[data-coupon-code]');if(!action||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button>0)return;
    e.preventDefault();if(action.dataset.busy)return;action.dataset.busy='true';
    let copied=false;
    try{await navigator.clipboard.writeText(action.dataset.couponCode);copied=true;}catch{
      const field=document.createElement('textarea');field.value=action.dataset.couponCode;field.readOnly=true;field.style.cssText='position:fixed;opacity:0';document.body.append(field);field.select();try{copied=document.execCommand('copy');}catch{}finally{field.remove();}
    }
    if(copied||action.dataset.manual==='true'){location.assign(action.href);return;}
    const card=action.closest('.cp');card.querySelector('.coupon-value').style.userSelect='all';card.querySelector('.coupon-copy-status').textContent='Selecione e copie o código acima. Depois, clique para ir à loja.';action.textContent='Ir pra loja';action.dataset.manual='true';delete action.dataset.busy;
  });
  setInterval(()=>{if(day!==ML.day())render();},1000);
  setInterval(()=>{if(!document.hidden)refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();refresh();}});
  render();refresh();
})(typeof window!=='undefined'?window:globalThis);
