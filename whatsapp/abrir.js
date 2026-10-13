'use strict';
(function(){
  const CODE='Fuf1CMjvycwK7P695VPTof';
  const INVITE='https://chat.whatsapp.com/'+CODE;
  function isInvite(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chat.whatsapp.com'&&u.pathname==='/'+CODE;}catch(e){return false;}}
  function prepare(a){a.href=INVITE;a.target='_blank';a.rel='noopener noreferrer';}
  function cliqueDireto(event,url){
    const a=event&&event.currentTarget;
    if(!isInvite(url)||!a||a.tagName!=='A'||event.defaultPrevented)return false;
    prepare(a);
    return true;
  }
  function abrir(url){location.assign(isInvite(url)?INVITE:url);}
  function prepareLinks(){document.querySelectorAll('a[href]').forEach(function(a){if(isInvite(a.href))prepare(a);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepareLinks);else prepareLinks();
  window.DespencouWhatsApp={abrir:abrir,cliqueDireto:cliqueDireto,convite:INVITE};
})();
