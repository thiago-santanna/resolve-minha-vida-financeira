# Planejamento do MVP - Resolve Minha Vida Financeira

Com base no Product Requirements Document (PRD) inicial, a arquitetura de base de dados já estabelecida (Supabase Schema) e o esqueleto de UI (React + Vite + Tailwind), dividiremos as entregas nas seguintes Sprints iterativas.

O objetivo é focarmos na entrega de valor constante, módulo a módulo, sempre validando a estética premium que o projeto exige.

---

## 🏁 Sprint 1: Fundação & Autenticação (Status: Em Andamento)
**Objetivo:** Garantir a porta de entrada segura do usuário com o Supabase Auth.
* **Tarefas:**
  - [x] Criação do Banco de Dados / Row Level Security (RLS).
  - [x] Configuração das chaves de ambiente (`.env`).
  - [x] Implementação de navegação segura (Private Routes no React-Router).
  - [x] Ligação real do formulário de Login/Cadastro com o `supabase.auth`.
  - [x] Recuperação da Sessão/Usuário logado (Contexto Global ou Zustand) para exibir dados reais na Sidebar e garantir a passagem do Token nas requisições.

## 🛠️ Sprint 2: Cadastros Base (O Motor de Domínio) (Status: Concluída ✅)
**Objetivo:** Permitir que o usuário construa sua estrutura financeira (bancos, contas e categorias).
* **Tarefas:**
  - [x] Construção do Script e Ferramenta de Seed Automática (80% dos dados para testes/onboarding).
  - [x] Iniciar componente/Página de Gestão de Cadastros (`/cadastros`).
  - [x] **Bancos e Contas Bancárias:** CRUD para vincular as contas bancárias (ex: "Nubank - Conta Corrente").
  - [x] **Categorias:** CRUD para Contas de Despesa e Contas de Receita.
  - [x] **Contas de Investimento:** CRUD mapeando a instituição e o tipo de aplicação.
  - [x] UI fluída com abas verticais ou horizontais, Modais de inclusão de registro e tratamento de erros (Toasts).

## 💰 Sprint 3: Lançamentos & Processamento em Lote (Core Flow) (Status: Concluída ✅)
**Objetivo:** O coração do sistema. Onde o usuário informa o que entra e o que sai.
* **Tarefas:**
  - [x] Tabela principal na rota `/lancamentos` consumindo os dados reais unificados (Receitas vs Despesas do mês).
  - [x] **Lançamento Único:** Conectar o formulário do modal (Mockado) à base de dados para inclusão de `receipts` e `payments`.
  - [x] **Lançamento em Lote (Mensal):** Conectar a aba "Lote" do Modal às funções `RPC` (`create_receipts_batch` e `create_payments_batch`), validando o loop seguro criado no Postgres.
  - [x] Interface visual para **dar Baixa** (Marcar como Recebido/Pago), abrindo modal de confirmação para informar "Valor Real" e "Data Real", que muitas vezes difere da quantia esperada.

## 📈 Sprint 4: Dashboards & Relatórios Inteligentes (Status: Concluída ✅)
**Objetivo:** Trazer visão estratégica para as finanças usando as Views SQL já modeladas.
* **Tarefas:**
  - [x] **Dashboard Principal:** Ligar os Kards/Gráficos de `/dashboard` diretamente à view `view_monthly_balance` do mês corrente.
  - [x] Construir Rota/Página de Relatórios Exclusivos.
  - [x] **Relatório 1 (Contas a Receber):** Consumindo `view_receipts_report` com filtro por Status/Data/Tipo; cálculo de `delta`.
  - [x] **Relatório 2 (Contas a Pagar):** Consumindo `view_payments_report` com lógica paralela; exibição de métricas somadas.
  - [x] **Relatório 3 (Balanço Customizado):** Listagem acumulada e visualização geral de Receita Mês vs Despesa Mês.

## 💎 Sprint 5: Módulo de Investimentos & "Wow Factor" (Status: Concluída ✅)
**Objetivo:** Fechar o escopo operacional e lapidar a estética / DX do App.
* **Tarefas:**
  - [x] Construir Rota/Página `/investimentos` visualizando o catálogo de carteira e permitindo lançamentos do tipo (DEPOSIT / WITHDRAWAL).
  - [x] Máscaras Monetárias Avançadas nos inputs (R$ 0.000,00 automático).
  - [x] Refinamentos de "Glassmorphism" adicionais, Loading Skeletons nas tabelas, e Empty-States amigáveis quando o usuário não tiver nada cadastrado ("Comece a controlar sua vida aqui").
  - [x] Revisão geral do Layout Mobile (Responsividade no Menu Inferior ou Hamburguer avançado).

---
*Escopo fechado alinhado aos requisitos do MVP Original.*
