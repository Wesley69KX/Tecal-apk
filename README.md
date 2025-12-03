# Painel de Torres PWA

Web App progressivo para gestão de torres, com suporte offline e sincronização.

## Estrutura
- **public/**: Frontend (HTML, CSS, JS, SW).
- **api/**: Backend Serverless (Node.js) para Vercel.

## Como fazer Deploy no Vercel

1. Instale a Vercel CLI: `npm i -g vercel`
2. Na raiz do projeto, rode: `vercel`
3. Siga as instruções no terminal.

## Como instalar no iPhone (iOS)

1. Abra o site no Safari.
2. Toque no botão "Compartilhar" (quadrado com seta para cima).
3. Selecione "Adicionar à Tela de Início".
4. O app aparecerá como um ícone nativo e funcionará em tela cheia.

## Testando Offline & Sync

1. **Online:** Adicione uma torre. O app salva no IndexedDB e envia para `/api/towers`.
2. **Offline:** Desligue a internet (Modo Avião ou DevTools > Network > Offline). Adicione/Edite uma torre. Ela será salva localmente e colocada na fila `outbox`.
3. **Reconectar:** Ligue a internet. O app detecta o evento `online` ou clique em "Sync". O `outbox` é enviado para o servidor.

## Notas sobre Persistência

A API atual (`api/towers.js`) usa armazenamento em memória para fins de demonstração. No Vercel, o sistema de arquivos é efêmero. Para produção real, altere `api/towers.js` para conectar ao Supabase, Firebase ou MongoDB.
