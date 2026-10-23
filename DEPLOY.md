# 🚀 Colocar a Lanches da Ari no ar (Supabase + GitHub + Vercel)

Guia passo a passo, na ordem. Cada etapa leva poucos minutos e nada é instalado
no computador — tudo acontece no navegador. Dúvida em qualquer ponto, me chama.

> **Importante:** crie um projeto do Supabase **novo** para a Ari — não reaproveite
> o banco da Mary Delivery, senão o site mistura os negócios.

---

## 1) Criar o projeto no Supabase (o banco de dados)

1. Acesse **supabase.com** → entre na sua conta → **New project**.
2. Preencha:
   - **Name**: `lanches-da-ari`
   - **Database password**: clique em **Generate** e **guarde essa senha** num lugar seguro (vai precisar dela no passo 3).
   - **Region**: **South America (São Paulo)** — a mais rápida pro Brasil.
3. Clique em **Create new project** e espere ~2 minutos (o banco está sendo criado).
4. Copie o endereço de conexão: menu lateral **Project Settings** (⚙️) → **Database** →
   seção **Connection poolers** → use a string **URI do "Transaction pooler"** (porta **6543**).
   Ela é parecida com:
   `postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
5. Troque o `[YOUR-PASSWORD]` pela senha que você guardou no passo 2.
   **Importante:** se a senha tiver símbolos (`@ : / # ? %`), eles precisam de codificação
   especial dentro da string (por exemplo `@` vira `%40`) — por isso o ideal é uma senha
   **gerada pelo Supabase** ou escolhida por você usando **só letras e números**.
   Guarde essa string completa — é a **DATABASE_URL** que a Vercel vai usar (seção 4).

> É a string do **Transaction pooler** mesmo (porta 6543) — a recomendada para sites na
> Vercel. Se a tela mostrar também um "Session pooler" (porta 5432) ou uma conexão
> "Direct", não são essas. O aviso "Configuration is shared across all connection
> poolers" é só informativo — nada a configurar ali.

## 2) Criar as tabelas

1. No Supabase: menu lateral **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` desta pasta, copie **todo** o conteúdo e cole no editor.
3. Clique em **Run**.
4. O Supabase vai perguntar sobre **Row Level Security (RLS)** → escolha **"Run and enable RLS"**.
   É uma trava de segurança extra: o site conecta como dono do banco (não é afetado) e a
   chave pública do projeto fica 100% bloqueada.
5. Deve aparecer **Success** e a lista com as 9 tabelas.

## 3) Subir o código para o GitHub (repositório PRIVADO)

✅ **Já está pronto:** o repositório local foi iniciado, o commit inicial foi feito
(63 arquivos) e o remote já aponta para `github.com/cunhapedro19-dotcom/lanchesdaari`.
O `.gitignore` já deixa de fora o `.env` e os arquivos locais antigos
(`database*.txt`, `logo-mary.jpg`, `previa-icones.png`) — nada de credenciais ou da
Mary vai para o repositório.

Falta só o **push**, que precisa do seu login no GitHub — por isso é feito no
seu computador:

1. Abra o terminal na pasta do projeto (Digite "cmd" no menu Iniciar, ou clique com o
   botão direito dentro da pasta → "Abrir no Terminal") e cole:

```bash
cd "C:\Users\Dell\Downloads\lanches da ari\lanches da ari"
git push -u origin main
```

2. Uma janela do navegador vai abrir pedindo login no GitHub — entre na sua conta e
   **autorize o Git**. O push segue sozinho (só pede login na primeira vez).
3. Se aparecer erro de **"dubious ownership"**, cole a linha abaixo e repita o push:

```bash
git config --global --add safe.directory "C:/Users/Dell/Downloads/lanches da ari/lanches da ari"
```

> - Se o `git` não for reconhecido no cmd, instale o Git para Windows em
>   **git-scm.com/download/win** (pode dar "Next" em tudo) e abra o terminal de novo.
> - Se o push for **rejeitado** porque o repositório foi criado com um README, cole:
>   `git push -u origin main --force` (o repositório é novo; o código da pasta é o certo).
> - O `.env` e os arquivos `database*.txt` (credenciais locais) **nunca** vão para o
>   GitHub (o `.gitignore` já bloqueia) — e nesta fase o `.env` nem precisa existir:
>   a senha do banco vai direto para a Vercel.

## 4) Publicar na Vercel

1. **vercel.com** → entre → **Add New... → Project**.
2. Clique em **Import** no repositório `lanchesdaari`.
3. Em **Environment Variables**, adicione:
   - **Key**: `DATABASE_URL`
   - **Value**: a string completa do passo 1.5 (com a senha já trocada)
   - Environment: deixe marcado **Production** e **Preview**.
4. Clique em **Deploy** e espere 2–3 minutos.

Se aparecer **Congratulations** 🎉 o site já está no ar no link
`lanches-da-ari-xxxx.vercel.app`. A partir de agora, todo `git push` no repositório
publica uma versão nova automaticamente.

## 5) Primeira visita (o site se prepara sozinho)

Abra o link no navegador. Na **primeira** visita o site cria sozinho:

- a **Lanches da Ari**, com o WhatsApp (21) 98712-2872 já cadastrado;
- o **cardápio real do panfleto** (lanches, batatas, combos, sobremesas, Guaracamp,
  complementos e molhos — veja o README);
- o acesso ao painel: **usuário `admin`** / senha **`ari-lanches-2026`**.

O cardápio nasce **PAUSADO** de propósito — depois de conferir tudo no painel, os
clientes só passam a ver o cardápio quando você clicar em **REABRIR PEDIDOS**.

## 6) Checklist depois de no ar

1. Entre em `SEU-LINK/admin/login` com `admin` / `ari-lanches-2026`.
2. **Troque a senha**: Configurações → Meu acesso (o painel fica lembrando até trocar).
3. Cardápio → Produtos: confira os preços do cardápio e, quando quiser, cadastre fotos
   dos produtos (eles já nascem funcionando sem foto).
4. Configurações: confira WhatsApp, Entrega (endereço de retirada e bairros), Pagamentos
   e Horários.
5. Faça um pedido de teste no celular: montar → enviar pelo WhatsApp → ver se chega
   no (21) 98712-2872 → aparecer na aba **Pedidos** do painel.
6. Tudo certo? Tela inicial do painel → **REABRIR PEDIDOS** 🟢.
7. Instale o painel no celular: abra `/admin` no Chrome → "Instalar aplicativo"
   (Android) ou Compartilhar → Adicionar à Tela de Início (iPhone).
8. (Opcional, depois) Compre um domínio e conecte em **Settings → Domains** na Vercel.

---

## Rodar no computador (opcional — só se quiser desenvolver local)

O site vive na Vercel; rodar local é só para testar mudanças de código:

```bash
npm install
# crie um arquivo .env com:  DATABASE_URL=<a string do Supabase da Ari>
npx drizzle-kit push   # ou rode o supabase/schema.sql no SQL Editor, uma vez só
npm run dev            # abre em http://localhost:3000
```
