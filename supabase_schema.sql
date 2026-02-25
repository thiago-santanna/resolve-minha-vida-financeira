-- =========================================================================================
-- 1. EXTENSÕES & TIPOS (ENUMS)
-- =========================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE receipt_status AS ENUM ('PENDING', 'RECEIVED', 'CANCELED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'CANCELED');
CREATE TYPE investment_transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'EARNINGS', 'FEE');

-- =========================================================================================
-- 2. TABELAS (SCHEMA)
-- =========================================================================================

-- BANCOS
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTAS BANCÁRIAS
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Ex: Conta Corrente, Poupança, etc
  initial_balance NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTAS DE INVESTIMENTO
CREATE TABLE investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Ex: CDB, Ações, Cripto
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTAS DE DESPESA (Categorias)
CREATE TABLE expense_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT, -- Ex: fixa, variavel
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTAS DE RECEITA (Categorias)
CREATE TABLE revenue_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECEBIMENTOS (Contas a Receber)
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  revenue_account_id UUID REFERENCES revenue_accounts(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  expected_amount NUMERIC NOT NULL,
  status receipt_status DEFAULT 'PENDING',
  received_date DATE,
  received_amount NUMERIC,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAGAMENTOS (Contas a Pagar)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  expense_account_id UUID REFERENCES expense_accounts(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  expected_amount NUMERIC NOT NULL,
  status payment_status DEFAULT 'PENDING',
  paid_date DATE,
  paid_amount NUMERIC,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LANÇAMENTOS DE INVESTIMENTO
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  type investment_transaction_type NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================================
-- 3. POLÍTICAS DE RLS (Row Level Security)
-- =========================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Políticas universais (CRUD completo para o dono do registro)
CREATE POLICY "Acesso total aos proprios bancos" ON banks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total as proprias contas bancarias" ON bank_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total as proprias contas de investimento" ON investment_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total as proprias categorias de despesa" ON expense_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total as proprias categorias de receita" ON revenue_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total aos proprios recebimentos" ON receipts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total aos proprios pagamentos" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total aos proprios investimentos" ON investments FOR ALL USING (auth.uid() = user_id);

-- =========================================================================================
-- 4. FUNÇÕES RPC (Lancamento em Lote Atômico)
-- =========================================================================================

-- Lançamento em Lote p/ Receitas
CREATE OR REPLACE FUNCTION create_receipts_batch(
  p_description TEXT,
  p_revenue_account_id UUID,
  p_expected_amount NUMERIC,
  p_start_date DATE,
  p_occurrences INT,
  p_bank_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_due_date DATE;
BEGIN
  -- Resgata o usuário logado para manter multi-tenant seguro
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  FOR i IN 0..(p_occurrences - 1) LOOP
    -- Acrescenta os meses à data de início. Postgres lida com fins de mês automaticamente.
    v_due_date := p_start_date + (i || ' month')::INTERVAL;
    
    INSERT INTO receipts (
      user_id, description, revenue_account_id, expected_amount, due_date, status, bank_account_id, notes
    ) VALUES (
      v_user_id, p_description, p_revenue_account_id, p_expected_amount, v_due_date, 'PENDING', p_bank_account_id, p_notes
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Lançamento em Lote p/ Despesas
CREATE OR REPLACE FUNCTION create_payments_batch(
  p_description TEXT,
  p_expense_account_id UUID,
  p_expected_amount NUMERIC,
  p_start_date DATE,
  p_occurrences INT,
  p_bank_account_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_due_date DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  FOR i IN 0..(p_occurrences - 1) LOOP
    v_due_date := p_start_date + (i || ' month')::INTERVAL;
    
    INSERT INTO payments (
      user_id, description, expense_account_id, expected_amount, due_date, status, bank_account_id, notes
    ) VALUES (
      v_user_id, p_description, p_expense_account_id, p_expected_amount, v_due_date, 'PENDING', p_bank_account_id, p_notes
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- =========================================================================================
-- 5. VIEWS PARA RELATÓRIOS
-- =========================================================================================

-- View: Relatório Contas a Receber
CREATE OR REPLACE VIEW view_receipts_report AS
SELECT 
  r.id, 
  r.user_id, 
  r.description, 
  r.due_date, 
  r.expected_amount, 
  r.status, 
  r.received_date, 
  r.received_amount, 
  r.revenue_account_id, 
  ra.name as revenue_account_name,
  -- lida com possíveis valores nulos
  COALESCE(r.received_amount, 0) as realized_amount,
  (r.expected_amount - COALESCE(r.received_amount, 0)) as delta
FROM receipts r
LEFT JOIN revenue_accounts ra ON r.revenue_account_id = ra.id;

-- View: Relatório Contas a Pagar
CREATE OR REPLACE VIEW view_payments_report AS
SELECT 
  p.id, 
  p.user_id, 
  p.description, 
  p.due_date, 
  p.expected_amount, 
  p.status, 
  p.paid_date, 
  p.paid_amount, 
  p.expense_account_id, 
  ea.name as expense_account_name,
  COALESCE(p.paid_amount, 0) as realized_amount,
  (p.expected_amount - COALESCE(p.paid_amount, 0)) as delta
FROM payments p
LEFT JOIN expense_accounts ea ON p.expense_account_id = ea.id;

-- View: Balanço Mensal
CREATE OR REPLACE VIEW view_monthly_balance AS
WITH ALL_MONTHS AS (
  SELECT DISTINCT date_trunc('month', due_date) AS month_date, user_id FROM receipts
  UNION
  SELECT DISTINCT date_trunc('month', due_date) AS month_date, user_id FROM payments
),
MONTHLY_INCOME AS (
  SELECT 
    date_trunc('month', due_date) AS month_date, 
    user_id,
    SUM(CASE WHEN status = 'RECEIVED' THEN received_amount ELSE expected_amount END) AS total_income
  FROM receipts
  GROUP BY 1, 2
),
MONTHLY_EXPENSE AS (
  SELECT 
    date_trunc('month', due_date) AS month_date, 
    user_id,
    SUM(CASE WHEN status = 'PAID' THEN paid_amount ELSE expected_amount END) AS total_expense
  FROM payments
  GROUP BY 1, 2
)
SELECT 
  am.month_date,
  am.user_id,
  COALESCE(mi.total_income, 0) AS total_income,
  COALESCE(me.total_expense, 0) AS total_expense,
  COALESCE(mi.total_income, 0) - COALESCE(me.total_expense, 0) AS month_balance
FROM ALL_MONTHS am
LEFT JOIN MONTHLY_INCOME mi ON am.month_date = mi.month_date AND am.user_id = mi.user_id
LEFT JOIN MONTHLY_EXPENSE me ON am.month_date = me.month_date AND am.user_id = me.user_id;

-- =========================================================================================
-- FIM DO SCHEMA
-- =========================================================================================
