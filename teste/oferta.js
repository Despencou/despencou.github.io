'use strict';
(async()=>{
  const API='https://midia.despencou.com';
  const root=document.querySelector('#offer-detail');
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
  const retailerLink=(label,url,cls)=>{const a=el('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  const id=new URLSearchParams(location.search).get('id');
  function unavailable(text){root.replaceChildren(el('h1',null,'Oferta indisponível'),el('p',null,text));const a=el('a','btn wa','Ver ofertas recentes');a.href='/teste/';root.append(a);}
  if(!id || !/^tg-\d+$/.test(id)){unavailable('Abra uma oferta pelo catálogo para consultar os detalhes.');return;}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(API+'/site-feed',{signal:controller.signal});
    if(!response.ok)throw Error('feed');
    const data=await response.json();
    const item=Array.isArray(data.items)&&data.items.find(i=>i.id===id&&i.kind==='offer');
    if(!item||!Number.isFinite(item.price)||item.price<=0||!DespencouCoupons.safeRetailer(item.url)){unavailable('Esta publicação não está mais no catálogo recente. Confira as novas ofertas.');return;}
    const coupon=DespencouCoupons.parse(item);
    document.title=item.title+' | Despencou';
    const card=el('article','offer-detail-card');
    card.append(el('h1',null,item.title));
    const photo=el('div','offer-detail-photo');
    if(/^\/site-images\/tg-\d+\.jpg$/.test(item.image||'')){const img=el('img');img.src=API+item.image;img.alt=item.title;photo.append(img);}else photo.append(el('span',null,'🛍️'));
    card.append(photo);
    if(coupon.hasCoupon){
      const box=el('section','offer-coupons');box.setAttribute('aria-label','Cupons e instruções');
      box.append(el('h2',null,coupon.codes.length>1?'Cupons da publicação':'Cupom da oferta'));
      coupon.codes.forEach(code=>{
        const row=el('div','offer-coupon-code');const value=el('strong',null,code);const button=el('button',null,'Copiar cupom');button.type='button';
        button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);button.textContent='Copiado!';setTimeout(()=>button.textContent='Copiar cupom',2500);}catch{button.textContent='Selecione o código';value.tabIndex=0;value.focus();}});
        row.append(value,button);box.append(row);
      });
      coupon.instructions.forEach(text=>box.append(el('p','offer-coupon-instruction',text)));
      if(coupon.redeemUrl)box.append(retailerLink('Resgatar cupom',coupon.redeemUrl,'btn redeem-coupon'));
      card.append(box);
    }
    card.append(retailerLink('Ir à loja',coupon.productUrl,'btn wa offer-store-button'));
    const prices=el('div','offer-detail-prices');if(item.old_price)prices.append(el('span','old',money(item.old_price)));prices.append(el('strong','offer-detail-price',money(item.price)));card.append(prices);
    card.append(el('p','offer-detail-store','Loja: '+item.store));
    card.append(el('p','muted','Preços, estoque e cupons podem mudar. Confira as condições na loja antes de comprar.'));
    const conditions=el('section','offer-conditions');conditions.append(el('h2',null,'Condições da publicação'),el('p',null,item.description));card.append(conditions);root.replaceChildren(card);
  }catch{unavailable('Não foi possível carregar esta oferta agora. Tente novamente em instantes.');}
  finally{clearTimeout(timer);}
})();

