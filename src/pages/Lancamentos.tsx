import { useState, useEffect } from 'react';
import { Plus, Search, Clock, X, TrendingUp, TrendingDown, Calendar, CheckCircle, AlertCircle, Edit2, Trash2, Check, Undo2 } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';



export const LancamentosPage = () => {
    const { user } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [isLote, setIsLote] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });

    const [lancamentos, setLancamentos] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        type: 'expense',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        occurrences: 2,
    });

    const [categories, setCategories] = useState<{ id: string, name: string, type: 'expense' | 'revenue' }[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);

    // Edit/Maintenance States
    const [editingItem, setEditingItem] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string, entity_type: string, name: string } | null>(null);

    // Baixa States
    const [baixaModalOpen, setBaixaModalOpen] = useState(false);
    const [baixaItem, setBaixaItem] = useState<any>(null);
    const [baixaForm, setBaixaForm] = useState({ amount: '', date: '', bank_account_id: '' });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const startDate = `${currentMonth}-01`;
            const lastDay = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).getDate();
            const endDate = `${currentMonth}-${lastDay}`;

            const { data: receipts } = await supabase
                .from('view_receipts_report')
                .select('*')
                .gte('due_date', startDate)
                .lte('due_date', endDate);

            const { data: payments } = await supabase
                .from('view_payments_report')
                .select('*')
                .gte('due_date', startDate)
                .lte('due_date', endDate);

            const [{ data: expCats }, { data: revCats }, { data: bAccs }] = await Promise.all([
                supabase.from('expense_accounts').select('id, name'),
                supabase.from('revenue_accounts').select('id, name'),
                supabase.from('bank_accounts').select('id, name').eq('active', true)
            ]);

            const allCats = [
                ...(expCats || []).map(c => ({ ...c, type: 'expense' as const })),
                ...(revCats || []).map(c => ({ ...c, type: 'revenue' as const }))
            ];
            setCategories(allCats);
            setBankAccounts(bAccs || []);

            const unified = [
                ...(receipts || []).map(r => ({ ...r, entity_type: 'revenue' })),
                ...(payments || []).map(p => ({ ...p, entity_type: 'expense' }))
            ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

            setLancamentos(unified);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar lançamentos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) loadData();
    }, [currentMonth, user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingItem) {
                const table = formData.type === 'revenue' ? 'receipts' : 'payments';
                const payload = {
                    description: formData.description,
                    expected_amount: parseFloat(formData.amount),
                    due_date: formData.date,
                    ...(formData.type === 'revenue' ? { revenue_account_id: formData.category_id || null } : { expense_account_id: formData.category_id || null })
                };
                const { error } = await supabase.from(table).update(payload).eq('id', editingItem.id);
                if (error) throw error;
                showToast('Lançamento atualizado com sucesso!', 'success');
            } else if (isLote) {
                if (formData.type === 'revenue') {
                    const { error } = await supabase.rpc('create_receipts_batch', {
                        p_description: formData.description,
                        p_revenue_account_id: formData.category_id || null,
                        p_expected_amount: parseFloat(formData.amount),
                        p_start_date: formData.date,
                        p_occurrences: parseInt(formData.occurrences)
                    });
                    if (error) throw error;
                } else {
                    const { error } = await supabase.rpc('create_payments_batch', {
                        p_description: formData.description,
                        p_expense_account_id: formData.category_id || null,
                        p_expected_amount: parseFloat(formData.amount),
                        p_start_date: formData.date,
                        p_occurrences: parseInt(formData.occurrences)
                    });
                    if (error) throw error;
                }
                showToast('Lote gerado com sucesso!', 'success');
            } else {
                const payload = {
                    user_id: user?.id,
                    description: formData.description,
                    expected_amount: parseFloat(formData.amount),
                    due_date: formData.date,
                    status: 'PENDING'
                };
                if (formData.type === 'revenue') {
                    const { error } = await supabase.from('receipts').insert([{ ...payload, revenue_account_id: formData.category_id || null }]);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('payments').insert([{ ...payload, expense_account_id: formData.category_id || null }]);
                    if (error) throw error;
                }
                showToast('Lançamento salvo com sucesso!', 'success');
            }

            setModalOpen(false);
            setEditingItem(null);
            await loadData();
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao salvar: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const processDelete = async () => {
        if (!confirmDelete) return;
        setSaving(true);
        try {
            const table = confirmDelete.entity_type === 'revenue' ? 'receipts' : 'payments';
            const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
            if (error) throw error;

            showToast('Lançamento excluído com sucesso!', 'success');
            setConfirmDelete(null);
            await loadData();
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao excluir: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setFormData({
            type: item.entity_type,
            description: item.description,
            amount: item.expected_amount,
            date: item.due_date,
            category_id: item.entity_type === 'revenue' ? (item.revenue_account_id || '') : (item.expense_account_id || ''),
            occurrences: 1,
        });
        setIsLote(false);
        setModalOpen(true);
    };

    const openBaixaModal = (item: any) => {
        setBaixaItem(item);
        setBaixaForm({
            amount: item.expected_amount,
            date: new Date().toISOString().split('T')[0],
            bank_account_id: ''
        });
        setBaixaModalOpen(true);
    };

    const handleProcessBaixa = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const isRevenue = baixaItem.entity_type === 'revenue';
            const table = isRevenue ? 'receipts' : 'payments';
            const payload = isRevenue
                ? { status: 'RECEIVED', received_amount: parseFloat(baixaForm.amount), received_date: baixaForm.date, bank_account_id: baixaForm.bank_account_id }
                : { status: 'PAID', paid_amount: parseFloat(baixaForm.amount), paid_date: baixaForm.date, bank_account_id: baixaForm.bank_account_id };

            const { error } = await supabase.from(table).update(payload).eq('id', baixaItem.id);
            if (error) throw error;

            showToast('Baixa realizada com sucesso!', 'success');
            setBaixaModalOpen(false);
            await loadData();
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao realizar baixa: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUndoBaixa = async (item: any) => {
        if (!window.confirm(`Tem certeza que deseja desfazer a baixa de "${item.description}"?`)) return;
        setSaving(true);
        try {
            const isRevenue = item.entity_type === 'revenue';
            const table = isRevenue ? 'receipts' : 'payments';
            const payload = isRevenue
                ? { status: 'PENDING', received_amount: null, received_date: null, bank_account_id: null }
                : { status: 'PENDING', paid_amount: null, paid_date: null, bank_account_id: null };

            const { error } = await supabase.from(table).update(payload).eq('id', item.id);
            if (error) throw error;

            showToast('Baixa desfeita com sucesso!', 'success');
            await loadData();
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao desfazer baixa: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const [year, month] = currentMonth.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        if (direction === 'prev') date.setMonth(date.getMonth() - 1);
        else date.setMonth(date.getMonth() + 1);
        setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const filteredCategories = categories.filter(c => c.type === (editingItem ? formData.type : formData.type));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 relative">

            {toast && (
                <div className={`fixed bottom-4 right-4 z-[999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-red-600 text-white shadow-red-600/20'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Lançamentos</h1>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setFormData({ type: 'expense', description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', occurrences: 2 });
                        setModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-primary hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
                >
                    <Plus size={20} />
                    <span>Novo Lançamento</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4 md:items-center flex-col md:flex-row justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                        <button onClick={() => handleMonthChange('prev')} className="p-1 hover:text-primary transition-colors hover:bg-indigo-50 rounded">&larr;</button>
                        <div className="flex items-center space-x-2 font-bold text-gray-700 w-32 justify-center">
                            <Calendar size={18} className="text-primary" />
                            <span>{currentMonth}</span>
                        </div>
                        <button onClick={() => handleMonthChange('next')} className="p-1 hover:text-primary transition-colors hover:bg-indigo-50 rounded">&rarr;</button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 space-y-6">
                        <div className="hidden md:flex justify-between items-center border-b border-gray-100 pb-4 mb-2">
                            <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-32 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-24 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-24 animate-pulse"></div>
                            <div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div>
                        </div>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-12 hidden md:block"></div>
                                <div className="flex items-center space-x-4 flex-1 md:ml-12">
                                    <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                                    </div>
                                </div>
                                <div className="h-6 bg-gray-200 rounded w-16 hidden md:block mr-8"></div>
                                <div className="h-6 bg-gray-200 rounded w-20 hidden md:block mr-8"></div>
                                <div className="flex space-x-2">
                                    <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
                                    <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : lancamentos.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-gray-100">
                            <Search size={24} className="text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">Nenhum lançamento neste mês</p>
                        <p className="mt-1 text-sm">Clique em "Novo Lançamento" para começar.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
                                    <th className="py-4 px-6 font-medium">Data</th>
                                    <th className="py-4 px-6 font-medium">Descrição</th>
                                    <th className="py-4 px-6 font-medium">Categoria</th>
                                    <th className="py-4 px-6 font-medium">Status</th>
                                    <th className="py-4 px-6 font-medium text-right">Valor</th>
                                    <th className="py-4 px-6 font-medium text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lancamentos.map((row: any) => {
                                    const isRevenue = row.entity_type === 'revenue';
                                    const isPaid = row.status === 'PAID' || row.status === 'RECEIVED';
                                    const dateObj = new Date((isPaid ? (row.paid_date || row.received_date) : row.due_date) + 'T00:00:00');
                                    const displayAmount = isPaid ? row.realized_amount : row.expected_amount;

                                    return (
                                        <tr key={row.id + row.entity_type} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${isPaid ? 'opacity-70 bg-gray-50/30' : ''}`}>
                                            <td className="py-4 px-6 text-sm text-gray-600 font-medium whitespace-nowrap">
                                                {String(dateObj.getDate()).padStart(2, '0')}/{String(dateObj.getMonth() + 1).padStart(2, '0')}
                                                {isPaid && <span className="block text-[10px] text-gray-400 font-normal">Pagamento</span>}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-gray-900">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-2 rounded-lg ${isRevenue ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {isRevenue ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                    </div>
                                                    <span className={isPaid ? 'line-through text-gray-500' : ''}>{row.description}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500">
                                                {row.revenue_account_name || row.expense_account_name || '-'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {isPaid ? (isRevenue ? 'Recebido' : 'Pago') : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className={`py-4 px-6 text-right font-bold ${isRevenue ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isRevenue ? '+' : '-'}{formatCurrency(displayAmount)}
                                                {isPaid && row.expected_amount !== displayAmount && (
                                                    <div className="text-[10px] font-normal text-gray-400">Era {formatCurrency(row.expected_amount)}</div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-center space-x-1 whitespace-nowrap">
                                                {!isPaid ? (
                                                    <button onClick={() => openBaixaModal(row)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Dar Baixa">
                                                        <Check size={18} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleUndoBaixa(row)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Desfazer Baixa">
                                                        <Undo2 size={18} />
                                                    </button>
                                                )}

                                                <button onClick={() => openEditModal(row)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => setConfirmDelete({ isOpen: true, id: row.id, entity_type: row.entity_type, name: row.description })} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Novo/Edição Lançamento / Lote */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                            <button onClick={() => { setModalOpen(false); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm"><X size={20} /></button>
                        </div>

                        <div className="p-6">
                            {!editingItem && (
                                <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLote ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setIsLote(false)}
                                    >
                                        Único
                                    </button>
                                    <button
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLote ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        onClick={() => setIsLote(true)}
                                    >
                                        Em Lote (Mensal)
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                    <input required type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Conta de Luz / Salário" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <CurrencyInput
                                            id="amount"
                                            name="amount"
                                            placeholder="R$ 0,00"
                                            decimalsLimit={2}
                                            decimalSeparator=","
                                            groupSeparator="."
                                            prefix="R$ "
                                            value={formData.amount}
                                            onValueChange={(value) => setFormData({ ...formData, amount: value ? value.replace(',', '.') : '' })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                        <select disabled={!!editingItem} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white disabled:opacity-50">
                                            <option value="expense">Despesa (-)</option>
                                            <option value="revenue">Receita (+)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria (Opcional)</label>
                                    <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white">
                                        <option value="">Sem Categoria</option>
                                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {isLote && !editingItem ? (
                                    <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Data Início</label>
                                            <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Nº Ocorrências</label>
                                            <input required type="number" min="2" max="120" value={formData.occurrences} onChange={(e) => setFormData({ ...formData, occurrences: e.target.value })} placeholder="Ex: 12" className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="col-span-2 text-xs text-indigo-600 flex items-center gap-2 mt-1">
                                            <Clock size={14} /> Serão gerados {formData.occurrences} registros mensais.
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                                        <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => { setModalOpen(false); setEditingItem(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-70">
                                        {saving ? 'Aguarde...' : `Salvar ${editingItem ? 'Alteração' : (isLote ? 'Lote' : 'Lançamento')}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Lançamento?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Tem certeza que quer excluir <strong>{confirmDelete.name}</strong>? Essa operação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={processDelete} disabled={saving} className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70">
                                    {saving ? 'Aguarde...' : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Baixa Modal (Dar Baixa) */}
            {baixaModalOpen && baixaItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {baixaItem.entity_type === 'revenue' ? 'Recebimento' : 'Pagamento'}
                            </h2>
                            <button onClick={() => setBaixaModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleProcessBaixa} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Efetivo (R$)</label>
                                    <CurrencyInput
                                        id="baixa-amount"
                                        name="baixa-amount"
                                        placeholder="R$ 0,00"
                                        decimalsLimit={2}
                                        decimalSeparator=","
                                        groupSeparator="."
                                        prefix="R$ "
                                        value={baixaForm.amount}
                                        onValueChange={(value) => setBaixaForm({ ...baixaForm, amount: value ? value.replace(',', '.') : '' })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Efetiva</label>
                                    <input required type="date" value={baixaForm.date} onChange={(e) => setBaixaForm({ ...baixaForm, date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Conta Bancária</label>
                                    <select required value={baixaForm.bank_account_id} onChange={(e) => setBaixaForm({ ...baixaForm, bank_account_id: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white">
                                        <option value="">Selecione a conta...</option>
                                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setBaixaModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-70">
                                        {saving ? 'Aguarde...' : 'Confirmar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
