'use strict';
(function(){
  const CODE='Fuf1CMjvycwK7P695VPTof';
  const INVITE='https://chat.whatsapp.com/'+CODE+'?mode=wwt';
  function mobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1);}
  function isInvite(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chat.whatsapp.com'&&u.pathname==='/'+CODE;}catch(e){return false;}}
  function abrir(url){
    if(!isInvite(url)||!mobile()){location.assign(url);return;}
    let left=false;let timer;
    function cleanup(){clearTimeout(timer);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onHide);}
    function onHide(){left=true;cleanup();}
    function onVisibility(){if(document.visibilityState==='hidden')onHide();}
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',onHide);
    timer=setTimeout(function(){cleanup();if(!left&&document.visibilityState==='visible')location.assign('/whatsapp/?manual=1');},1800);
    // Executado diretamente no clique, antes de qualquer espera assíncrona.
    location.assign('whatsapp://chat/?code='+CODE);
  }
  window.DespencouWhatsApp={abrir:abrir,mobile:mobile,convite:INVITE};
})();
