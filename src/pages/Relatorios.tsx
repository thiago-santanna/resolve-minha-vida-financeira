import { useState, useEffect } from 'react';
import { Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
);

export const RelatoriosPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        startDate: firstDay,
        endDate: lastDay,
        type: 'ALL', // ALL, REVENUE, EXPENSE
        status: 'ALL', // ALL, PENDING, REALIZED
    });

    const [resultados, setResultados] = useState<any[]>([]);
    const [summary, setSummary] = useState({ revenue_expected: 0, revenue_realized: 0, expense_expected: 0, expense_realized: 0 });

    const loadData = async () => {
        setLoading(true);
        try {
            let receipts: any[] = [];
            let payments: any[] = [];

            // Get Receipts
            if (filters.type === 'ALL' || filters.type === 'REVENUE') {
                let query = supabase.from('view_receipts_report').select('*')
                    .gte('due_date', filters.startDate)
                    .lte('due_date', filters.endDate);

                if (filters.status === 'PENDING') query = query.eq('status', 'PENDING');
                if (filters.status === 'REALIZED') query = query.eq('status', 'RECEIVED');

                const { data } = await query;
                if (data) receipts = data;
            }

            // Get Payments
            if (filters.type === 'ALL' || filters.type === 'EXPENSE') {
                let query = supabase.from('view_payments_report').select('*')
                    .gte('due_date', filters.startDate)
                    .lte('due_date', filters.endDate);

                if (filters.status === 'PENDING') query = query.eq('status', 'PENDING');
                if (filters.status === 'REALIZED') query = query.eq('status', 'PAID');

                const { data } = await query;
                if (data) payments = data;
            }

            const unified = [
                ...receipts.map(r => ({ ...r, entity_type: 'revenue' })),
                ...payments.map(p => ({ ...p, entity_type: 'expense' }))
            ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

            setResultados(unified);

            // Compute metrics
            const metrics = {
                revenue_expected: receipts.reduce((acc, curr) => acc + curr.expected_amount, 0),
                revenue_realized: receipts.reduce((acc, curr) => acc + (curr.realized_amount || 0), 0),
                expense_expected: payments.reduce((acc, curr) => acc + curr.expected_amount, 0),
                expense_realized: payments.reduce((acc, curr) => acc + (curr.realized_amount || 0), 0),
            };

            setSummary(metrics);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, filters]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Relatórios Customizados</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 transition-colors">Gere visões financeiras baseadas nos filtros selecionados.</p>
                </div>
            </div>

            {/* Area de Filtros */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end transition-colors">
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Data Início</label>
                    <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 dark:text-white transition-colors" />
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Data Fim</label>
                    <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 dark:text-white transition-colors" />
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Tipo de Lançamento</label>
                    <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 dark:text-white transition-colors">
                        <option value="ALL">Receitas e Despesas</option>
                        <option value="REVENUE">Apenas Receitas</option>
                        <option value="EXPENSE">Apenas Despesas</option>
                    </select>
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Status</label>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-700 dark:text-white transition-colors">
                        <option value="ALL">Todos os status</option>
                        <option value="PENDING">Apenas Pendentes</option>
                        <option value="REALIZED">Apenas Efetivados</option>
                    </select>
                </div>
            </div>

            {/* Area de Resumo (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm transition-colors">Receitas Planejadas</h3>
                        <TrendingUp size={18} className="text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{formatCurrency(summary.revenue_expected)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800/50 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <h3 className="text-emerald-700 dark:text-emerald-400 font-medium text-sm transition-colors">Receitas Efetivadas</h3>
                        <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 relative z-10 transition-colors">{formatCurrency(summary.revenue_realized)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-500 dark:text-slate-400 font-medium text-sm transition-colors">Despesas Planejadas</h3>
                        <TrendingDown size={18} className="text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{formatCurrency(summary.expense_expected)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-5 rounded-2xl shadow-sm border border-red-100 dark:border-red-800/50 hover:shadow-md transition-all relative overflow-hidden">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <h3 className="text-red-700 dark:text-red-400 font-medium text-sm transition-colors">Despesas Efetivadas</h3>
                        <TrendingDown size={18} className="text-red-600 dark:text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300 relative z-10 transition-colors">{formatCurrency(summary.expense_realized)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between transition-colors gap-4 sm:gap-0">
                <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                    <h3 className="text-indigo-900 dark:text-indigo-300 font-bold mb-1 transition-colors">Resultado Projetado (Esperado)</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors">{formatCurrency(summary.revenue_expected - summary.expense_expected)}</p>
                </div>
                <div className="w-full sm:w-px h-px sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 sm:mx-6 transition-colors"></div>
                <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                    <h3 className="text-indigo-900 dark:text-indigo-300 font-bold mb-1 transition-colors">Resultado Realizado (Efetivo)</h3>
                    <p className={`text-xl font-bold transition-colors ${(summary.revenue_realized - summary.expense_realized) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(summary.revenue_realized - summary.expense_realized)}
                    </p>
                </div>
                <div className="w-full sm:w-auto flex justify-center sm:block mt-4 sm:mt-0">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-inner transition-colors"><DollarSign size={24} /></div>
                </div>
            </div>

            {/* Tabela de Resultados */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white transition-colors">Extrato Detalhado do Período</h2>
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors">{resultados.length} registros encontrados</span>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><Spinner /></div>
                ) : resultados.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-slate-400 transition-colors">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-700 mb-4 border border-gray-100 dark:border-slate-600 transition-colors">
                            <Filter size={24} className="text-gray-400 dark:text-slate-500" />
                        </div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white transition-colors">Nenhum dado encontrado com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 transition-colors">
                                    <th className="py-3 px-6 font-semibold">Data Previsão</th>
                                    <th className="py-3 px-6 font-semibold">Descrição</th>
                                    <th className="py-3 px-6 font-semibold">Categoria</th>
                                    <th className="py-3 px-6 font-semibold text-center">Status</th>
                                    <th className="py-3 px-6 font-semibold text-right">Valor Esperado</th>
                                    <th className="py-3 px-6 font-semibold text-right">Data Realizado</th>
                                    <th className="py-3 px-6 font-semibold text-right">Valor Realizado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50 transition-colors">
                                {resultados.map((row: any) => {
                                    const isRevenue = row.entity_type === 'revenue';
                                    const isPaid = row.status === 'PAID' || row.status === 'RECEIVED';
                                    const dueObj = new Date(row.due_date + 'T00:00:00');
                                    const doneObj = isPaid ? new Date((row.paid_date || row.received_date) + 'T00:00:00') : null;

                                    return (
                                        <tr key={row.id + row.entity_type} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="py-3 px-6 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap transition-colors">
                                                {String(dueObj.getDate()).padStart(2, '0')}/{String(dueObj.getMonth() + 1).padStart(2, '0')}/{dueObj.getFullYear()}
                                            </td>
                                            <td className="py-3 px-6 text-sm font-medium text-gray-900 dark:text-white transition-colors">
                                                <div className="flex items-center gap-2">
                                                    {isRevenue ? <TrendingUp size={14} className="text-emerald-500 dark:text-emerald-400" /> : <TrendingDown size={14} className="text-red-500 dark:text-red-400" />}
                                                    {row.description}
                                                </div>
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-500 dark:text-slate-400 transition-colors">
                                                {row.revenue_account_name || row.expense_account_name || '-'}
                                            </td>
                                            <td className="py-3 px-6 text-center">
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                                                    {isPaid ? 'Efetivado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className={`py-3 px-6 text-sm text-right font-medium transition-colors ${isRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {isRevenue ? '+' : '-'}{formatCurrency(row.expected_amount)}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-500 dark:text-slate-400 text-right whitespace-nowrap transition-colors">
                                                {doneObj ? `${String(doneObj.getDate()).padStart(2, '0')}/${String(doneObj.getMonth() + 1).padStart(2, '0')}/${doneObj.getFullYear()}` : '-'}
                                            </td>
                                            <td className={`py-3 px-6 text-sm text-right font-bold transition-colors ${isPaid ? (isRevenue ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400') : 'text-gray-400 dark:text-slate-500'}`}>
                                                {isPaid ? (isRevenue ? '+' : '-') + formatCurrency(row.realized_amount) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
