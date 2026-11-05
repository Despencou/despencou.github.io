'use strict';
(function(root){
 const size=16;
 const count=total=>Math.max(1,Math.ceil(Math.max(0,Number(total)||0)/size));
 const url=page=>page===1?'/':`/ofertas/pagina/${page}/`;
 function render(total,page=1,limit=size){
  const pages=count(total);if(pages<2)return '';
  page=Math.max(1,Math.min(pages,page));
  const end=Math.min(pages,page+Math.ceil(limit/size)-1);
  const selected=new Set([1,pages,page,end]);
  for(let n=Math.max(1,page-1);n<=Math.min(pages,page+2);n++)selected.add(n);
  const link=(n,label,rel='')=>`<a href="${url(n)}#catalog-start"${rel?` rel="${rel}"`:''} aria-label="${label==='Próxima →'?'Próxima página de ofertas':label==='← Anterior'?'Página anterior de ofertas':'Página '+n}">${label}</a>`;
  let numbers='',previous=0;
  for(const n of [...selected].sort((a,b)=>a-b)){
   if(previous&&n>previous+1)numbers+='<span class="pagination-gap" aria-hidden="true">…</span>';
   numbers+=n===page?`<span aria-current="page" aria-label="Página ${n}, atual">${n}</span>`:link(n,String(n));previous=n;
  }
  return `<p class="pagination-summary">${end===page?`Página ${page}`:`Páginas ${page} a ${end}`} de ${pages}</p><div class="pagination-links">${page>1?link(page-1,'← Anterior','prev'):''}${numbers}${end<pages?link(end+1,'Próxima →','next'):''}</div>`;
 }
 const api={size,count,url,render};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DespencouPagination=api;
})(typeof window!=='undefined'?window:globalThis);
