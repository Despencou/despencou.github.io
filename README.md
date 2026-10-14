# Site do Despencou

URL: https://despencou.com/

O layout foi adaptado do HTML fornecido pelo proprietário. Mantém o banner e a estrutura de ofertas, cupons e blog; usa o mascote original, busca de produtos, filtro por loja e ordenação por data/preço. Desktop e celular compartilham o mesmo layout responsivo.

`app.js` consulta `https://midia.despencou.com/site-feed` a cada minuto. O feed é alimentado pelo leitor de Telegram do repositório privado `Despencou/shopee-radar`, que acompanha o canal público `@despencou` a cada 15 segundos. Fotografias são persistidas no servidor antes da limpeza das imagens temporárias do Twitter.

- Não há produtos ou cupons de exemplo nos cards: os dados vêm do canal.
- Preços são os valores da publicação; as páginas das ofertas mostram cupons e instruções de resgate. Confirme preço, estoque e validade na loja.
- Blog preparado visualmente e marcado como Em breve.
- Catálogo no domínio principal; LP dos anúncios em `/entrar/`; LP alternativa em `/teste/` (com `noindex`).
- Botões de grupo usam os links oficiais já configurados. Links de produtos são os links afiliados publicados no Telegram.

# Indexação e arquivo permanente

O servidor preserva os produtos em `site-data/offers/`, fora do limite do catálogo. A API pública `/site-offers` fornece esse arquivo. O catálogo continua limitado a ofertas de 7 dias e cupons de 2 dias; sair dele marca a publicação como encerrada, sem confirmar estoque na loja.

`scripts/build-site.cjs` gera HTML completo em `/oferta/tg-ID/`, título, descrição, canonical e sitemap. O workflow `publish-site.yml` publica a cada alteração e a cada 30 minutos (o agendamento do GitHub pode atrasar). Uma falha na API interrompe a publicação e preserva a versão anterior. O frontend consulta o estado atual; links novos usam a página dinâmica até existir a versão estática. Links antigos `/oferta/?id=tg-ID` continuam funcionando.

Para o blog, preencha `content/articles.json` com objetos contendo `slug`, `title`, `description`, `author`, `published_at` (ISO), `paragraphs` (lista de textos) e `published: true` somente após a revisão. Rascunhos e artigos futuros não são gerados nem entram no sitemap. Sem artigos publicados, `/blog/` usa noindex. Os artigos publicados são indexáveis e aparecem na aba Blog.

Home e institucionais ficam indexáveis; `/teste/` mantém noindex e não entra no sitemap. O robots.txt permite a leitura da tag noindex. A indexação final depende do Google; envie `https://despencou.com/sitemap.xml` ao Search Console. LP `/entrar/`, Pixel e CAPI não foram alterados neste ajuste.
