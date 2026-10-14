'use strict';
(async()=>{
  const API='https://midia.despencou.com';
  const root=document.querySelector('#offer-detail');
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const retailerLink=(label,url,cls)=>{const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='sponsored noopener noreferrer';return a;};
  const staticPage=!!root.dataset.offerId;
  const id=root.dataset.offerId||new URLSearchParams(location.search).get('id');
  function bindCopy(){root.querySelectorAll('[data-copy-coupon]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.dataset.copyCoupon);button.textContent='Copiado!';setTimeout(()=>button.textContent='Copiar cupom',2500);}catch{button.textContent='Selecione o código';}}));}
  if(staticPage)bindCopy();
  function unavailable(text){root.replaceChildren(el('h1',null,'Oferta indisponível'),el('p',null,text));const a=el('a','btn wa','Ver ofertas recentes');a.href='/';root.append(a);}
  if(!id || !/^tg-\d+$/.test(id)){unavailable('Abra uma oferta pelo catálogo para consultar os detalhes.');return;}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    if(!staticPage){try{const map=await (await fetch('/site-page-map.json',{signal:controller.signal})).json();if(map[id]==='/oferta/'+id+'/'){location.replace(map[id]);return;}}catch{}}
    const response=await fetch(API+'/site-offers/'+encodeURIComponent(id),{signal:controller.signal});
    if(!response.ok)throw Error('feed');
    const item=await response.json();
    if(!item||item.id!==id||item.kind!=='offer'||!Number.isFinite(item.price)||item.price<=0||!DespencouCoupons.safeRetailer(item.url))throw Error('Invalid offer');
    const coupon=DespencouCoupons.parse(item);
    document.title=item.title+' | Despencou';
    const card=el('article','offer-detail-card');
    card.append(el('h1',null,item.title));
    card.append(el('p','offer-state'+(item.ended?' ended':''),item.ended?'Oferta encerrada':'Oferta publicada recentemente'));
    if(item.ended)card.append(el('p','muted','Esta oferta saiu do catálogo recente. Mantivemos os detalhes como histórico; o preço e o cupom abaixo podem não estar mais disponíveis. Confira a situação atual na loja.'));
    const photo=el('div','offer-detail-photo');
    if(/^\/site-images\/tg-\d+\.jpg$/.test(item.image||'')){const img=el('img');img.src=API+item.image;img.alt=item.title;photo.append(img);}else photo.append(el('span',null,'🛍️'));
    card.append(photo);
    if(coupon.hasCoupon){
      const box=el('section','offer-coupons');box.setAttribute('aria-label','Cupons e instruções');
      box.append(el('h2',null,item.ended?'Cupom da publicação (confira a validade)':coupon.codes.length>1?'Cupons da publicação':'Cupom da oferta'));
      coupon.codes.forEach(code=>{
        const row=el('div','offer-coupon-code');const value=el('strong',null,code);const button=el('button',null,'Copiar cupom');button.type='button';
        button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);button.textContent='Copiado!';setTimeout(()=>button.textContent='Copiar cupom',2500);}catch{button.textContent='Selecione o código';value.tabIndex=0;value.focus();}});
        row.append(value,button);box.append(row);
      });
      coupon.instructions.forEach(text=>box.append(el('p','offer-coupon-instruction',text)));
      if(coupon.redeemUrl)box.append(retailerLink('Resgatar cupom',coupon.redeemUrl,'btn redeem-coupon'));
      card.append(box);
    }
    card.append(retailerLink(item.ended?'Ver produto na loja':'Ir à loja',coupon.productUrl,'btn wa offer-store-button'));
    const prices=el('div','offer-detail-prices');prices.append(el('span','muted','Preço da publicação'));if(item.old_price)prices.append(el('span','old',money(item.old_price)));prices.append(el('strong','offer-detail-price',money(item.price)));card.append(prices);
    const payment=window.DespencouPayments?.label(item);if(payment)prices.append(el('span','muted',payment));
    card.append(el('p','offer-detail-store','Loja: '+item.store));
    card.append(el('p','muted','Publicado em '+new Date(item.published_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. Preços, estoque e cupons podem mudar. Confira as condições na loja antes de comprar.'));
    const recent=el('a',null,'Ver ofertas recentes');recent.href='/';card.append(recent);
    root.replaceChildren(card);
  }catch{if(!staticPage)unavailable('Não foi possível carregar esta oferta agora. Tente novamente em instantes.');}
  finally{clearTimeout(timer);}
})();



