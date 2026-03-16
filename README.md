# Construtora ERP

Sistema de Gestão (ERP) focado em **Construtoras de Pequeno e Médio Porte**, oferecendo visibilidade em tempo real sobre projetos sob a ótica física e financeira.

---

## 🏗️ Estrutura do Sistema

- **Projetos & Obras:** Cronogramas (Gantt), Abastecimento de Almoxarifados e Curva S físico-financeira.
- **Financeiro:** Importação de notas via XML e extratos via OFX, Controle de Contas a Pagar/Receber e Centro de Custo Diário.
- **Suprimentos:** Cotações de Compras automáticas, Quadro Comparativo e Emissão de Pedidos (Workflow de aprovação alinhado ao Orçamento).
- **Medições de Empreiteiros:** Contratos integrados e cálculos automáticos de boletins de prestação de serviços com emissão automática de pagamentos ao financeiro.
- **BI / Analytics:** Painéis executivos com visualização em Recharts focados nas conversões comerciais e tempo de ciclo de compras. Emissão nativa de PDFs gerenciais.
- **Multi-tenant Seguro:** Segurança por nível de linha isolando construtoras através de autenticação (Supabase) + Proteção por Prisma Extensions / Middleware do Next.js (Não há RLS direto no banco).

---

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI, Recharts
- **Backend/API:** tRPC, Server Actions
- **Banco de Dados:** PostgreSQL hospedado no Supabase
- **ORM:** Prisma
- **Autenticação:** Supabase Auth (Magic Links / Email+Senha)
- **Rate Limit:** Upstash Redis (Serverless limit para fluxos de importações massivas e auth)

---

## 💻 Instalação Local (Desenvolvimento)

### Pré-requisitos
- Node.js (v18+)
- Banco de Dados Postgres (Ou projeto Supabase criado)
- Upstash Redis gratuito 

### 1. Clonar o projeto e instalar dependências

```bash
git clone https://github.com/construtora-erp.git
cd construtora-erp
npm install
```

### 2. Configurar as Variáveis de Ambiente
Copie o `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

Preencha os dados primordiais no seu `.env`:
```env
# URL do banco de dados
DATABASE_URL="postgresql://postgres.[ID]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL
DIRECT_URL="postgres://postgres.[ID]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://[ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="CHAVE_ANONIMA"

# Upstash
UPSTASH_REDIS_REST_URL="URL_REDIS"
UPSTASH_REDIS_REST_TOKEN="TOKEN_REDIS"
```

### 3. Sincronizar Banco de Dados
```bash
# Sincroniza o Schema do Prisma com o seu banco Postgres
npx prisma db push

# Gera o os tipos do Client para o Typescript local
npx prisma generate
```

### 4. Rodar o projeto
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador. Quando tentar fazer o primeiro login/registro, ele o direcionará para o `/onboarding` antes de desbloquear o Sistema.

---

## 🚀 Como Fazer o Deploy para Produção (Vercel)

Esta aplicação foi polida estruturalmente para deploy na Vercel (Edge Functions & Next.js otimizado).

### Ações no Painel do Supabase
1. **Ative a Autenticação por Email e Senha** no Supabase Auth.
2. Desligue os Confirmations Emails (Caso não queira usar SMTP customizado durante fase de testes de tração).
3. **Hardening de Banco de Dados:** Apesar de a segurança do tenant estar no Prisma, **abilite o RLS (Row Level Security)** do Postgres no Supabase para as tabelas principais, mas NÃO crie regras. Isso proíbe acessos anônimos do Data API que não venham de uma connection string com cargo `SERVICE_ROLE` (A string de conexão Prisma já tem esse nível).

### Ações no Console Upstash
1. Crie um banco **Global Redis** (Free tier suporta 10.000 chamadas/dia, perfeito para nosso bloqueio de auth).
2. Guarde as variáveis URL e TOKEN.

### Ações na Vercel
1. Conecte o repositório Github à Vercel.
2. Em **Environment Variables**, insira seu `DATABASE_URL`, o bloco do Supabase e o do Upstash.
3. Altere o *Build Command* para:
   `npx prisma db push && npx prisma generate && npm run build`
   *(Isso garante que toda alteração lançada vai atualizar as colunas em banco produtivo)*
4. Clique em **Deploy**.

Após concluir o deploy de forma com sucesso, não se esqueça de acessar as Políticas de Segurança do **Supabase Auth > URL Configuration** e adicionar o site final da vercel Ex: `https://meuerpconstrutora.vercel.app` à lista de Allowed URLs de Autenticação.
