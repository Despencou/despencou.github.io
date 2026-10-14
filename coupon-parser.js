'use strict';
(function(root) {
  function safeRetailer(url) {
    try { const u=new URL(url);return u.protocol==='https:' && ['shopee.com.br','amazon.com.br','amzn.to','mercadolivre.com.br','mercadolivre.com','meli.la','mercadolibre.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d)); } catch {return false;}
  }
  const clean = s => String(s||'').replace(/[*`]/g,'').trim();
  const urls = s => (String(s||'').match(/https?:\/\/[^\s<>]+/gi)||[]).map(u=>u.replace(/[.,;!?)"'\]]+$/g,'')).filter(safeRetailer);
  function parse(item) {
    const lines=String(item.description||'').split(/\r?\n/).map(clean);
    let codes=[], instructions=[], redeemUrl=null;
    for(let i=0;i<lines.length;i++){
      const line=lines[i];let lineHasCode=false;
      const match=line.match(/(?:use|resgate|aplique)\s+(?:o\s+)?cupom\s*[:：]\s*(.*)$/i);
      if(match){
        const raw=match[1] || lines[i+1] || '';
        if(!/^https?:/i.test(raw)){
          const first=raw.match(/^["'“]?([A-Za-z0-9][A-Za-z0-9_-]{1,39})(?=$|[\s"'”.,;])/);
          if(first && !/^(na|no|pagina|página|produto|link|abaixo|aqui)$/i.test(first[1])){
            codes.push(first[1]);lineHasCode=true;
            const rest=raw.slice(first.index+first[0].length);
            for(const extra of rest.matchAll(/(?:\bou\b|\+|\be\b|\/)\s*([A-Z0-9][A-Z0-9_-]{1,39})(?=$|[\s.,;])/g))codes.push(extra[1]);
          }
        }
      }
      if(!lineHasCode && /resgate\s+(?:o\s+)?cupom/i.test(line) && !/(?:p[aá]gina|produto|pr[oó]ximo|pre[cç]o)/i.test(line)){
        const next=urls(line)[0] || (lines.slice(i+1,i+3).find(Boolean) ? urls(lines.slice(i+1,i+3).find(Boolean))[0] : null);
        if(next)redeemUrl=next;
      }
      if(/(?:resgate|aplique|ative|selecione)\b.*\bcupom\b/i.test(line) && /(?:p[aá]gina|produto|an[uú]ncio|pr[oó]ximo|abaixo|pre[cç]o)/i.test(line) && !urls(line).length){
        instructions.push(line.replace(/^[^\p{L}\p{N}]+/u,''));
      }
    }
    if(!codes.length && item.code && /^[A-Za-z0-9_-]{2,40}$/.test(item.code))codes.push(item.code);
    const productUrls=urls(item.description).filter(u=>u!==redeemUrl);
    return {codes:[...new Set(codes)],instructions:[...new Set(instructions)],redeemUrl,
      productUrl:productUrls[0] || (safeRetailer(item.url)?item.url:null),
      hasCoupon:!!(codes.length||instructions.length||redeemUrl)};
  }
  const api={parse,safeRetailer};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else root.DespencouCoupons=api;
})(typeof window!=='undefined'?window:globalThis);

