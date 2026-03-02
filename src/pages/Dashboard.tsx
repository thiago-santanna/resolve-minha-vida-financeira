import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Landmark, Activity, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
);

export const DashboardPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Cards data
    const [balanceData, setBalanceData] = useState({
        income: 0,
        expense: 0,
        balance: 0
    });

    const [upcoming, setUpcoming] = useState<any[]>([]);
    const [accountsBalance, setAccountsBalance] = useState<any[]>([]);
    const [totalInvested, setTotalInvested] = useState<number>(0);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            // Format match current month for view_monthly_balance
            // We can just fetch all balances and find the one that matches this month's beginning
            const { data: balances } = await supabase
                .from('view_monthly_balance')
                .select('*');

            let currentBalanceRow = null;
            if (balances) {
                // Find the row where month_date corresponds to current year and month (avoid timezone shifts)
                currentBalanceRow = balances.find(b => {
                    const datePart = String(b.month_date).split('T')[0].split(' ')[0]; // Ex: "2026-03-01"
                    const [y, m] = datePart.split('-');
                    return parseInt(y) === year && m === month;
                });
            }

            if (currentBalanceRow) {
                setBalanceData({
                    income: currentBalanceRow.total_income || 0,
                    expense: currentBalanceRow.total_expense || 0,
                    balance: currentBalanceRow.month_balance || 0
                });
            } else {
                setBalanceData({ income: 0, expense: 0, balance: 0 });
            }

            // Fetch upcoming pending items (safe local timezone format limit)
            const todayStr = `${year}-${month}-${String(today.getDate()).padStart(2, '0')}`;
            const { data: pendingReceipts } = await supabase
                .from('view_receipts_report')
                .select('*')
                .eq('status', 'PENDING')
                .gte('due_date', todayStr);

            const { data: pendingPayments } = await supabase
                .from('view_payments_report')
                .select('*')
                .eq('status', 'PENDING')
                .gte('due_date', todayStr);

            const unifiedPending = [
                ...(pendingReceipts || []).map(r => ({ ...r, entity_type: 'revenue' })),
                ...(pendingPayments || []).map(p => ({ ...p, entity_type: 'expense' }))
            ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .slice(0, 5); // Take only top 5

            setUpcoming(unifiedPending);

            // Fetch accounts balance
            const { data: accsBalance } = await supabase.from('view_bank_accounts_balance').select('*');
            setAccountsBalance(accsBalance || []);

            const { data: invsBalance } = await supabase.from('view_investment_balance').select('*');
            setTotalInvested(invsBalance && invsBalance.length > 0 ? (invsBalance[0].total_invested || 0) : 0);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const getMonthName = () => {
        return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 capitalize transition-colors">Bem-vindo de volta! Aqui está o seu resumo de {getMonthName()}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                        <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm transition-colors">Receitas (Esperado)</h3>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors"><TrendingUp size={20} /></div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4 transition-colors">{formatCurrency(balanceData.income)}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-medium transition-colors">Neste mês</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                        <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm transition-colors">Despesas (Esperado)</h3>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400 transition-colors"><TrendingDown size={20} /></div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4 transition-colors">{formatCurrency(balanceData.expense)}</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-2 font-medium transition-colors">Dentro do planejado</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg border border-indigo-500 dark:border-indigo-500/50 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex justify-between items-center relative z-10">
                        <h3 className="text-indigo-100 font-medium text-sm">Previsão de Saldo</h3>
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white"><Wallet size={20} /></div>
                    </div>
                    <p className="text-3xl font-bold text-white mt-4 relative z-10">{formatCurrency(balanceData.balance)}</p>
                    <p className="text-sm text-indigo-200 mt-2 font-medium relative z-10">Restante no mês</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-start">
                {/* Widget de Saldos */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center transition-colors">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white transition-colors flex items-center gap-2">
                            <Landmark size={20} className="text-indigo-500" /> Saldos das Contas
                        </h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-4">
                            {accountsBalance.map(acc => (
                                <div key={acc.bank_account_id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-lg text-gray-500 dark:text-slate-400">
                                            <Building2 size={16} />
                                        </div>
                                        <span className="font-semibold text-gray-700 dark:text-slate-300">{acc.bank_account_name}</span>
                                    </div>
                                    <span className={`font-bold ${acc.current_balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>{formatCurrency(acc.current_balance)}</span>
                                </div>
                            ))}
                            {accountsBalance.length === 0 && (
                                <p className="text-center text-gray-500 text-sm py-4">Nenhuma conta com saldo registrada.</p>
                            )}

                            <hr className="border-gray-100 dark:border-slate-700 my-4" />

                            <div className="flex justify-between items-center p-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-500 dark:text-indigo-400">
                                        <Activity size={16} />
                                    </div>
                                    <span className="font-bold text-indigo-900 dark:text-indigo-300">Total Investido</span>
                                </div>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalInvested)}</span>
                            </div>

                            <div className="flex justify-between items-center p-4 mt-2 bg-gray-900 dark:bg-slate-700 rounded-xl shadow-lg border border-gray-800 dark:border-slate-600 transition-colors">
                                <span className="font-bold text-white text-sm uppercase tracking-wider">Patrimônio Líquido</span>
                                <span className="font-extrabold text-xl text-emerald-400">
                                    {formatCurrency(totalInvested + accountsBalance.reduce((acc, curr) => acc + Number(curr.current_balance), 0))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Widget de Vencimentos */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center transition-colors">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white transition-colors">Próximos Vencimentos</h2>
                        <Link to="/lancamentos" className="text-sm text-primary dark:text-indigo-400 font-medium hover:underline transition-colors">Ver todos</Link>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-slate-700/50 transition-colors">
                        {upcoming.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-slate-400 text-sm transition-colors">
                                Tudo limpo! Não há lançamentos pendentes pro futuro.
                            </div>
                        ) : (
                            upcoming.map((item) => {
                                const isRevenue = item.entity_type === 'revenue';
                                const dateObj = new Date(item.due_date + 'T00:00:00');

                                const day = String(dateObj.getDate()).padStart(2, '0');
                                const month = String(dateObj.getMonth() + 1).padStart(2, '0');

                                return (
                                    <div key={item.id + item.entity_type} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors gap-4">
                                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                                            <div className={`p-3 rounded-full flex-shrink-0 transition-colors ${isRevenue ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}>
                                                {isRevenue ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate transition-colors">{item.description}</p>
                                                <p className="text-sm text-gray-500 dark:text-slate-400 transition-colors">
                                                    Vence em: <span className="font-medium text-gray-700 dark:text-slate-300 transition-colors">{day}/{month}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                                            <p className={`font-bold transition-colors ${isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                                {isRevenue ? '+' : '-'} {formatCurrency(item.expected_amount)}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block mt-1 transition-colors">Pendente</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
