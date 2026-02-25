import { useState, useEffect } from 'react';
import { Plus, TrendingUp, ArrowUpRight, DollarSign, Building2, Activity, ShieldCheck, PieChart as PieChartIcon } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
);

export const InvestimentosPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [portfolioData, setPortfolioData] = useState<any[]>([]);

    // Resumo Geral
    const [summary, setSummary] = useState({
        totalInvested: 0,
        totalEarnings: 0,
        totalCurrent: 0
    });

    const [formData, setFormData] = useState({
        investment_account_id: '',
        type: 'DEPOSIT', // DEPOSIT, WITHDRAWAL, EARNINGS, FEE
        amount: '',
        date: new Date().toISOString().split('T')[0],
        bank_account_id: '',
        notes: ''
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Buscando as contas de investimento e as contas bancárias (para origem/destino do dinheiro)
            const [{ data: invAccs }, { data: bAccs }, { data: invs }] = await Promise.all([
                supabase.from('investment_accounts').select('*').eq('active', true),
                supabase.from('bank_accounts').select('id, name').eq('active', true),
                supabase.from('investments').select('*')
            ]);

            setAccounts(invAccs || []);
            setBankAccounts(bAccs || []);

            // Processando a carteira
            const portfolioMap = new Map();
            (invAccs || []).forEach(acc => {
                portfolioMap.set(acc.id, {
                    ...acc,
                    total_deposits: 0,
                    total_withdrawals: 0,
                    total_earnings: 0,
                    total_fees: 0,
                    current_balance: 0
                });
            });

            let globalDeposits = 0;
            let globalWithdrawals = 0;
            let globalEarnings = 0;
            let globalFees = 0;

            (invs || []).forEach(inv => {
                const acc = portfolioMap.get(inv.investment_account_id);
                if (!acc) return;

                const amount = Number(inv.amount);
                if (inv.type === 'DEPOSIT') {
                    acc.total_deposits += amount;
                    globalDeposits += amount;
                } else if (inv.type === 'WITHDRAWAL') {
                    acc.total_withdrawals += amount;
                    globalWithdrawals += amount;
                } else if (inv.type === 'EARNINGS') {
                    acc.total_earnings += amount;
                    globalEarnings += amount;
                } else if (inv.type === 'FEE') {
                    acc.total_fees += amount;
                    globalFees += amount;
                }

                acc.current_balance = (acc.total_deposits - acc.total_withdrawals) + (acc.total_earnings - acc.total_fees);
                portfolioMap.set(inv.investment_account_id, acc);
            });

            // Convert map to array and update summary
            const finalPortfolio = Array.from(portfolioMap.values()).sort((a, b) => b.current_balance - a.current_balance);
            setPortfolioData(finalPortfolio);

            const totalIn = globalDeposits - globalWithdrawals;
            const netEarnings = globalEarnings - globalFees;

            setSummary({
                totalInvested: totalIn,
                totalEarnings: netEarnings,
                totalCurrent: totalIn + netEarnings
            });

        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar dados da carteira', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                user_id: user?.id,
                investment_account_id: formData.investment_account_id,
                type: formData.type,
                amount: parseFloat(formData.amount),
                date: formData.date,
                notes: formData.notes || null,
                bank_account_id: (formData.type === 'DEPOSIT' || formData.type === 'WITHDRAWAL') ? (formData.bank_account_id || null) : null
            };

            const { error: invError } = await supabase.from('investments').insert([payload]);
            if (invError) throw invError;

            // Opcional: Aqui poderíamos automatizar o reflexo na conta bancária (inserindo em receipts/payments ou outra tabela). 
            // Para mantermos focado no escopo atual da Sprint, faremos apenas o registro do lado do investimento e consideraremos que o usuário tem maturidade para conciliar.
            // Num sistema robusto final, uma TRIGGER no banco resolveria a comunicação bidirecional.

            showToast('Movimentação registrada com sucesso!', 'success');
            setModalOpen(false);
            setFormData({
                investment_account_id: '',
                type: 'DEPOSIT',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                bank_account_id: '',
                notes: ''
            });
            await loadData();
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao salvar movimentação: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Ações': return <TrendingUp size={24} className="text-indigo-500" />;
            case 'CDB': return <ShieldCheck size={24} className="text-emerald-500" />;
            case 'Cripto': return <Activity size={24} className="text-amber-500" />;
            default: return <PieChartIcon size={24} className="text-blue-500" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 relative">

            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-[999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-red-600 text-white shadow-red-600/20'
                    }`}>
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">Investimentos</h1>
                    <p className="text-gray-500 mt-1 font-medium">Acompanhe a rentabilidade e movimentações da sua carteira.</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-semibold shadow-xl shadow-gray-200 hover:shadow-2xl hover:shadow-gray-300 transition-all hover:scale-105 transform active:scale-95"
                >
                    <Plus size={20} />
                    <span>Nova Movimentação</span>
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center"><Spinner /></div>
            ) : (
                <>
                    {/* Hero Section: Patrimônio Global */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {/* Blob Background Effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl -z-10 blur-3xl opacity-50 border border-white"></div>

                        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900 to-purple-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div>
                                    <h3 className="text-indigo-200 font-medium tracking-wide">Patrimônio Atual (Carteira)</h3>
                                    <div className="flex items-baseline space-x-3 mt-2">
                                        <h2 className="text-5xl font-extrabold text-white tracking-tight">{formatCurrency(summary.totalCurrent)}</h2>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-8">
                                    <div>
                                        <p className="text-indigo-300 text-sm font-medium mb-1">Total Aportado</p>
                                        <p className="text-xl font-bold text-white">{formatCurrency(summary.totalInvested)}</p>
                                    </div>
                                    <div>
                                        <p className="text-indigo-300 text-sm font-medium mb-1">Rendimento Histórico</p>
                                        <p className={`text-xl font-bold flex items-center ${summary.totalEarnings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {summary.totalEarnings >= 0 ? '+' : ''}{formatCurrency(summary.totalEarnings)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 flex flex-col gap-4">
                            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden hover:scale-105 transition-transform">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3"><ArrowUpRight size={24} /></div>
                                <p className="text-sm font-medium text-gray-500">Último Aporte</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">Nesta semana</p> {/* Placeholder contextual futuro */}
                            </div>
                            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden hover:scale-105 transition-transform">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3"><TrendingUp size={24} /></div>
                                <p className="text-sm font-medium text-gray-500">Ativos na Carteira</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">{portfolioData.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Lista Completa da Carteira de Ativos */}
                    <div>
                        <div className="flex items-center justify-between mb-6 mt-12">
                            <h2 className="text-2xl font-bold text-gray-900">Seus Ativos</h2>
                        </div>

                        {portfolioData.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                    <PieChartIcon size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Nenhum investimento detectado</h3>
                                <p className="text-gray-500 mt-1">Suas contas de investimento cadastradas aparecerão aqui quando possuírem lançamentos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {portfolioData.map((asset) => (
                                    <div key={asset.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group cursor-default relative overflow-hidden">

                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-1/2 -translate-y-1/2"></div>

                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex items-center space-x-4">
                                                <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                                    {getTypeIcon(asset.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{asset.name}</h3>
                                                    <div className="flex items-center space-x-1.5 text-sm text-gray-500 mt-1">
                                                        <Building2 size={14} />
                                                        <span className="font-medium">{asset.institution_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-semibold rounded-lg uppercase tracking-wider">{asset.type}</span>
                                        </div>

                                        <div className="mt-8 relative z-10">
                                            <p className="text-gray-500 text-sm font-medium mb-1">Saldo Líquido</p>
                                            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(asset.current_balance)}</p>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center relative z-10">
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">Lucro/Prejuízo</p>
                                                <p className={`text-sm font-bold mt-0.5 ${(asset.total_earnings - asset.total_fees) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {(asset.total_earnings - asset.total_fees) >= 0 ? '+' : ''}{formatCurrency(asset.total_earnings - asset.total_fees)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 font-medium">Aportes (Liq)</p>
                                                <p className="text-sm font-bold text-gray-700 mt-0.5">
                                                    {formatCurrency(asset.total_deposits - asset.total_withdrawals)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal de Nova Movimentação */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><DollarSign size={20} /></div>
                                <h2 className="text-xl font-extrabold text-gray-900">Registrar Movimentação</h2>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 bg-white rounded-full shadow-sm border border-gray-100 transition-all hover:scale-105">
                                X
                            </button>
                        </div>

                        <div className="p-6">
                            {accounts.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4 font-medium">Você ainda não castrou nenhuma Conta de Investimento.</p>
                                    <a href="/cadastros" className="text-primary font-bold hover:underline">Ir para Cadastros</a>
                                </div>
                            ) : (
                                <form onSubmit={handleSave} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Ativo / Aplicação</label>
                                        <select required value={formData.investment_account_id} onChange={(e) => setFormData({ ...formData, investment_account_id: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none bg-white transition-all font-medium text-gray-700">
                                            <option value="">Selecione o ativo...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.institution_name})</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo Operação</label>
                                            <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none bg-white font-medium text-gray-700">
                                                <option value="DEPOSIT">📥 Aporte (Depósito)</option>
                                                <option value="WITHDRAWAL">📤 Resgate (Saque)</option>
                                                <option value="EARNINGS">📈 Rendimento (+)</option>
                                                <option value="FEE">📉 Taxa/Despesa (-)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Valor (R$)</label>
                                            <CurrencyInput
                                                id="amount-invest"
                                                name="amount-invest"
                                                placeholder="R$ 0,00"
                                                decimalsLimit={2}
                                                decimalSeparator=","
                                                groupSeparator="."
                                                prefix="R$ "
                                                value={formData.amount}
                                                onValueChange={(value) => setFormData({ ...formData, amount: value ? value.replace(',', '.') : '' })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none font-bold text-gray-900"
                                            />
                                        </div>
                                    </div>

                                    {(formData.type === 'DEPOSIT' || formData.type === 'WITHDRAWAL') && (
                                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                                            <label className="block text-sm font-bold text-indigo-900 mb-1.5">
                                                {formData.type === 'DEPOSIT' ? 'De qual conta bancária saiu o dinheiro?' : 'Para qual conta bancária o dinheiro foi?'}
                                            </label>
                                            <select value={formData.bank_account_id} onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })} className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white text-sm">
                                                <option value="">Não vincular a uma conta bancária</option>
                                                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Data da Operação</label>
                                            <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none text-gray-700 font-medium" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Notas (Opcional)</label>
                                            <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none text-gray-700" placeholder="Ex: Aporte mensal de salário" />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 rounded-xl transition-colors">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={saving} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-gray-300 hover:shadow-xl disabled:opacity-70 disabled:hover:scale-100 active:scale-95 transform">
                                            {saving ? 'Processando...' : 'Confirmar Lançamento'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
