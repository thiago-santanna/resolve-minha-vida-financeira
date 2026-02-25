-- =========================================================================================
-- FUNÇÃO DE SEED (RPC) PARA POPULAR DADOS GENÉRICOS DE UM USUÁRIO RECÉM CADASTRADO
-- =========================================================================================

CREATE OR REPLACE FUNCTION seed_user_data()
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_bank_nubank UUID;
  v_bank_itau UUID;
  v_bank_bb UUID;
  v_bank_inter UUID;
BEGIN
  -- Resgata o id do usuário que está chamando a função
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. Esta função deve ser chamada pelo cliente (frontend) logado.';
  END IF;

  -- 1. POPULAR BANCOS COMUNS
  INSERT INTO banks (user_id, name, code) VALUES
    (v_user_id, 'Nubank', '260'),
    (v_user_id, 'Itaú Unibanco', '341'),
    (v_user_id, 'Banco do Brasil', '001'),
    (v_user_id, 'Banco Inter', '077'),
    (v_user_id, 'Caixa Econômica', '104'),
    (v_user_id, 'Santander', '033'),
    (v_user_id, 'Bradesco', '237'),
    (v_user_id, 'C6 Bank', '336');
  
  -- Seleciona os IDs recém inseridos para criar contas default
  SELECT id INTO v_bank_nubank FROM banks WHERE user_id = v_user_id AND code = '260' LIMIT 1;
  SELECT id INTO v_bank_itau FROM banks WHERE user_id = v_user_id AND code = '341' LIMIT 1;

  -- 2. POPULAR UMA OU DUAS CONTAS BANCÁRIAS GENÉRICAS
  INSERT INTO bank_accounts (user_id, bank_id, name, type, initial_balance) VALUES
    (v_user_id, v_bank_nubank, 'Conta Principal (Nubank)', 'Conta Corrente', 0.00),
    (v_user_id, v_bank_itau, 'Conta Reserva (Itaú)', 'Poupança', 0.00);

  -- 3. POPULAR CATEGORIAS DE RECEITAS (REVENUE_ACCOUNTS)
  INSERT INTO revenue_accounts (user_id, name) VALUES
    (v_user_id, 'Salário'),
    (v_user_id, 'Empréstimos/Cashback'),
    (v_user_id, 'Investimentos/Rendimentos'),
    (v_user_id, 'Freelance/Serviços Extras'),
    (v_user_id, 'Vendas'),
    (v_user_id, 'Outras Receitas');

  -- 4. POPULAR CATEGORIAS DE DESPESAS (EXPENSE_ACCOUNTS)
  INSERT INTO expense_accounts (user_id, name, kind) VALUES
    (v_user_id, 'Habitação (Aluguel, Luz, Água, Internet)', 'fixa'),
    (v_user_id, 'Alimentação (Supermercado, Padaria)', 'variavel'),
    (v_user_id, 'Transporte (Combustível, Uber, Ônibus)', 'variavel'),
    (v_user_id, 'Saúde (Plano, Farmácia, Consultas)', 'fixa'),
    (v_user_id, 'Educação (Faculdade, Cursos, Livros)', 'fixa'),
    (v_user_id, 'Lazer e Restaurantes (Ifood, Cinema, Bares)', 'variavel'),
    (v_user_id, 'Compras e Vestuário', 'variavel'),
    (v_user_id, 'Assinaturas (Netflix, Spotify, etc)', 'fixa'),
    (v_user_id, 'Taxas e Impostos', 'variavel'),
    (v_user_id, 'Outras Despesas', 'variavel');

  -- 5. POPULAR CONTAS DE INVESTIMENTO GENÉRICAS
  INSERT INTO investment_accounts (user_id, institution_name, name, type) VALUES
    (v_user_id, 'Nubank', 'Caixinhas Nu', 'Renda Fixa'),
    (v_user_id, 'XP Investimentos', 'Corretora XP', 'Ações/FIIs'),
    (v_user_id, 'Binance', 'Carteira Cripto', 'Criptomoedas'),
    (v_user_id, 'Tesouro Direto', 'Tesouro Selic/IPCA', 'Renda Fixa');

END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
