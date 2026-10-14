'use strict';
(function(root){
  function amount(s){return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s.replace(/\./g,''));}
  function condition(context){
    const pix=/\bpix\b/i.test(context);
    const installment=context.match(/\b(?:em\s+|at[eé]\s+)(\d{1,2})\s*(?:x\b|vezes\b|parcelas\b)/i)||context.match(/^\s*(\d{1,2})\s*(?:x\b|vezes\b|parcelas\b)/i);
    const n=installment?Number(installment[1]):0;
    const interest=/\bsem\s+juros\b/i.test(context)?' sem juros':/\bcom\s+juros\b/i.test(context)?' com juros':'';
    const recurring=/\brecorr[eê]ncia\b/i.test(context);
    let parts=[];
    if(pix)parts.push('No Pix');
    if(n>1&&n<=48)parts.push((/^até/i.test(installment[0])?'Até ':'Em ')+n+'x'+interest);
    else if(/\bparcelad[oa]\b/i.test(context))parts.push('Parcelado'+interest);
    else if(!pix&&/(?:^|\s)[aà]\s+vista\b/i.test(context))parts.push('À vista');
    else if(!pix&&/\b(?:no|com|via)\s+cart[aã]o\b/i.test(context))parts.push('No cartão');
    if(!parts.length)return '';
    let label=parts.map((p,i)=>i?p[0].toLowerCase()+p.slice(1):p).join(' ou ');
    if(recurring)label+=' · na recorrência';
    return label;
  }
  function label(item){
    if(!Number.isFinite(item.price)||item.price<=0)return '';
    const lines=String(item.description||'').replace(/[*`]/g,'').split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const line=lines[i].replace(/https?:\/\/\S+/gi,'');
      // Anchor to the exact advertised price, not a coupon threshold or old price.
      const prices=[...line.matchAll(/(?:R\$\s*|\b(?:por|pre[cç]o|valor)\s*:?\s*(?:apenas\s*)?(?:R\$\s*)?)(\d[\d.,]*)/gi)];
      for(let j=prices.length-1;j>=0;j--){
        const match=prices[j];if(Math.abs(amount(match[1])-item.price)>.005)continue;
        const end=prices[j+1]?prices[j+1].index:line.length;
        let context=line.slice(match.index+match[0].length,end);
        let result=condition(context);
        if(!result){
          const start=j?prices[j-1].index+prices[j-1][0].length:0;
          const prefix=line.slice(start,match.index);
          // Prefix-only payment lines: "No Pix: R$ 100".
          if(j===0&&!/\b(?:de|por)\b/i.test(prefix))result=condition(prefix);
        }
        if(!result&&i+1<lines.length){
          const next=lines[i+1].trim();
          // A dedicated next line belongs to this price; unrelated coupon instructions do not.
          if(/^(?:no\s+pix|via\s+pix|em\s+\d{1,2}\s*(?:x|vezes|parcelas)|at[eé]\s+\d{1,2}\s*x|parcelad[oa]|[aà]\s+vista)\b/i.test(next)&&!/[\d]\s*[.,]\s*\d|R\$/i.test(next))result=condition(next);
        }
        if(result)return result;
      }
    }
    return '';
  }
  const api={label};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DespencouPayments=api;
})(typeof window!=='undefined'?window:globalThis);
