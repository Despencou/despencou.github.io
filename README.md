# Site do Despencou

URL: https://despencou.com/

O layout foi adaptado do HTML fornecido pelo proprietário. Mantém o banner e a estrutura de ofertas, cupons e blog; usa o mascote original, busca de produtos, filtro por loja e ordenação por data/preço. Desktop e celular compartilham o mesmo layout responsivo.

`app.js` consulta `https://midia.despencou.com/site-feed` a cada minuto. O feed é alimentado pelo leitor de Telegram do repositório privado `Despencou/shopee-radar`, que acompanha o canal público `@despencou` a cada 15 segundos. Fotografias são persistidas no servidor antes da limpeza das imagens temporárias do Twitter.

- Não há produtos ou cupons de exemplo nos cards: os dados vêm do canal.
- Preços são os valores da publicação; as páginas das ofertas mostram cupons e instruções de resgate. Confirme preço, estoque e validade na loja.
- Blog preparado visualmente e marcado como Em breve.
- Catálogo no domínio principal; LP dos anúncios em `/entrar/`; LP alternativa em `/teste/` (com `noindex`).
- Botões de grupo usam os links oficiais já configurados. Links de produtos são os links afiliados publicados no Telegram.
