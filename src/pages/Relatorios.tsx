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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Relatórios Customizados</h1>
                    <p className="text-gray-500 mt-1">Gere visões financeiras baseadas nos filtros selecionados.</p>
                </div>
            </div>

            {/* Area de Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                    <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                    <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Lançamento</label>
                    <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white">
                        <option value="ALL">Receitas e Despesas</option>
                        <option value="REVENUE">Apenas Receitas</option>
                        <option value="EXPENSE">Apenas Despesas</option>
                    </select>
                </div>
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white">
                        <option value="ALL">Todos os status</option>
                        <option value="PENDING">Apenas Pendentes</option>
                        <option value="REALIZED">Apenas Efetivados</option>
                    </select>
                </div>
            </div>

            {/* Area de Resumo (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-500 font-medium text-sm">Receitas Planejadas</h3>
                        <TrendingUp size={18} className="text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.revenue_expected)}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <h3 className="text-emerald-700 font-medium text-sm">Receitas Efetivadas</h3>
                        <TrendingUp size={18} className="text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 relative z-10">{formatCurrency(summary.revenue_realized)}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-500 font-medium text-sm">Despesas Planejadas</h3>
                        <TrendingDown size={18} className="text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.expense_expected)}</p>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <h3 className="text-red-700 font-medium text-sm">Despesas Efetivadas</h3>
                        <TrendingDown size={18} className="text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-red-700 relative z-10">{formatCurrency(summary.expense_realized)}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-between">
                <div className="flex-1">
                    <h3 className="text-indigo-900 font-bold mb-1">Resultado Projetado (Esperado)</h3>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.revenue_expected - summary.expense_expected)}</p>
                </div>
                <div className="w-px h-12 bg-indigo-100 mx-6"></div>
                <div className="flex-1">
                    <h3 className="text-indigo-900 font-bold mb-1">Resultado Realizado (Efetivo)</h3>
                    <p className={`text-xl font-bold ${(summary.revenue_realized - summary.expense_realized) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.revenue_realized - summary.expense_realized)}
                    </p>
                </div>
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner ml-6"><DollarSign size={24} /></div>
            </div>

            {/* Tabela de Resultados */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900">Extrato Detalhado do Período</h2>
                    <span className="text-sm font-medium text-gray-500">{resultados.length} registros encontrados</span>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><Spinner /></div>
                ) : resultados.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-gray-100">
                            <Filter size={24} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">Nenhum dado encontrado com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-white">
                                    <th className="py-3 px-6 font-semibold">Data Previsão</th>
                                    <th className="py-3 px-6 font-semibold">Descrição</th>
                                    <th className="py-3 px-6 font-semibold">Categoria</th>
                                    <th className="py-3 px-6 font-semibold text-center">Status</th>
                                    <th className="py-3 px-6 font-semibold text-right">Valor Esperado</th>
                                    <th className="py-3 px-6 font-semibold text-right">Data Realizado</th>
                                    <th className="py-3 px-6 font-semibold text-right">Valor Realizado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {resultados.map((row: any) => {
                                    const isRevenue = row.entity_type === 'revenue';
                                    const isPaid = row.status === 'PAID' || row.status === 'RECEIVED';
                                    const dueObj = new Date(row.due_date + 'T00:00:00');
                                    const doneObj = isPaid ? new Date((row.paid_date || row.received_date) + 'T00:00:00') : null;

                                    return (
                                        <tr key={row.id + row.entity_type} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-3 px-6 text-sm text-gray-500 whitespace-nowrap">
                                                {String(dueObj.getDate()).padStart(2, '0')}/{String(dueObj.getMonth() + 1).padStart(2, '0')}/{dueObj.getFullYear()}
                                            </td>
                                            <td className="py-3 px-6 text-sm font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {isRevenue ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                                    {row.description}
                                                </div>
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-500">
                                                {row.revenue_account_name || row.expense_account_name || '-'}
                                            </td>
                                            <td className="py-3 px-6 text-center">
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {isPaid ? 'Efetivado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className={`py-3 px-6 text-sm text-right font-medium ${isRevenue ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isRevenue ? '+' : '-'}{formatCurrency(row.expected_amount)}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-500 text-right whitespace-nowrap">
                                                {doneObj ? `${String(doneObj.getDate()).padStart(2, '0')}/${String(doneObj.getMonth() + 1).padStart(2, '0')}/${doneObj.getFullYear()}` : '-'}
                                            </td>
                                            <td className={`py-3 px-6 text-sm text-right font-bold ${isPaid ? (isRevenue ? 'text-emerald-700' : 'text-red-700') : 'text-gray-400'}`}>
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
