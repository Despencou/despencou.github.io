'use strict';
(function(root){
  const destination='https://www.mercadolivre.com.br/social/kotinhapromo/lists/772cb2ed-b061-4357-aacc-06ec436c641e?matt_tool=32116382&forceInApp=true';
  const shopeeDailyDestination='https://shopee.com.br/m/cupom-de-desconto?mmp_pid=an_18383820308&uls_trackid=56tagngk00jl&utm_campaign=id_4nuHsmrDJHB&utm_content=----&utm_medium=affiliates&utm_source=an_18383820308&utm_term=fpq999xi8yuy';
  function day(value=new Date()){
    const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const part=t=>parts.find(p=>p.type===t).value;return part('year')+'-'+part('month')+'-'+part('day');
  }
  const imported=i=>i.source==='ml-coupon-page';
  const telegram=i=>i.store==='Mercado Livre'&&i.kind==='coupon'&&!imported(i);
  function discount(i){
    if(i.discount_type==='percent'&&Number.isFinite(i.discount_value))return i.discount_value;
    if(i.discount_type==='reais')return null;
    const m=String(i.title||'').match(/(\d+(?:[.,]\d+)?)\s*%/);return m?Number(m[1].replace(',','.')):null;
  }
  const removed=i=>imported(i)&&discount(i)===50&&/primeira compra|new buyers/i.test((i.category||'')+' '+i.title);
  function section(items,tab,today=day()){
    return items.filter(i=>i.kind==='coupon'&&i.store==='Mercado Livre'&&!removed(i)&&
      (tab==='today'?(imported(i)?i.valid_from===today:day(i.published_at)===today):
       imported(i)&&(tab!=='expires'||i.valid_until===today)));
  }
  function storeSection(items,store,tab,today=day()){
    if(store==='Mercado Livre')return section(items,tab,today);
    if(!['Shopee','Amazon'].includes(store))return [];
    return items.filter(i=>i.kind==='coupon'&&i.store===store&&(tab!=='today'||day(i.published_at)===today));
  }
  function order(items,mode){
    const missing=(value,fallback)=>Number.isFinite(value)?value:fallback;
    return [...items].sort((a,b)=>{
      if(mode==='discount')return (discount(b)??-Infinity)-(discount(a)??-Infinity)||missing(b.max_discount,-Infinity)-missing(a.max_discount,-Infinity);
      if(mode==='minimum')return missing(a.min_purchase,Infinity)-missing(b.min_purchase,Infinity);
      if(mode==='maximum')return missing(b.max_discount,-Infinity)-missing(a.max_discount,-Infinity);
      return String(b.valid_from||b.published_at||'').localeCompare(String(a.valid_from||a.published_at||''));
    });
  }
  // The home preview uses the same São Paulo calendar rules as the daily ML tab.
  function homeSection(items,today=day()){return order(section(items,'today',today),'recent');}
  const api={destination,shopeeDailyDestination,homeSection,day,imported,telegram,removed,section,storeSection,order};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DespencouMLCoupons=api;
})(typeof window!=='undefined'?window:globalThis);

