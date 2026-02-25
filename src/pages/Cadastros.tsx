import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Plus, Trash2, Edit2, Wallet, Landmark, Tag, TrendingUp, X } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper component for loading data
const Spinner = () => (
    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
);

export const CadastrosPage = () => {
    const { user } = useAuth();

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Toast & Confirm states
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, table: string, id: string, name: string } | null>(null);

    const [activeTab, setActiveTab] = useState<'banks' | 'bank_accounts' | 'expense_accounts' | 'revenue_accounts' | 'investment_accounts'>('banks');

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Estado dos dados
    const [data, setData] = useState({
        banks: [] as any[],
        bank_accounts: [] as any[],
        expense_accounts: [] as any[],
        revenue_accounts: [] as any[],
        investment_accounts: [] as any[],
    });
    const [loadingData, setLoadingData] = useState(true);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [
                { data: bks },
                { data: bkas },
                { data: exps },
                { data: revs },
                { data: invs }
            ] = await Promise.all([
                supabase.from('banks').select('*').order('name'),
                supabase.from('bank_accounts').select('*, banks(name)').order('name'),
                supabase.from('expense_accounts').select('*').order('name'),
                supabase.from('revenue_accounts').select('*').order('name'),
                supabase.from('investment_accounts').select('*').order('name'),
            ]);

            setData({
                banks: bks || [],
                bank_accounts: bkas || [],
                expense_accounts: exps || [],
                revenue_accounts: revs || [],
                investment_accounts: invs || [],
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteClick = (table: string, id: string, name: string = '') => {
        setConfirmDelete({ isOpen: true, table, id, name });
    };

    const processDelete = async () => {
        if (!confirmDelete) return;
        const { table, id } = confirmDelete;
        setConfirmDelete(null);

        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            showToast('Registro excluído com sucesso!', 'success');
            await loadData();
        } catch (error: any) {
            console.error('Erro exclusão:', error);
            showToast('Erro ao apagar registro: ' + error.message, 'error');
        }
    };

    const openModal = (item: any = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({ ...item });
        } else {
            // Default forms por tabela
            if (activeTab === 'bank_accounts') setFormData({ name: '', type: 'Conta Corrente', initial_balance: 0, bank_id: '' });
            else if (activeTab === 'expense_accounts') setFormData({ name: '', kind: 'variavel' });
            else if (activeTab === 'investment_accounts') setFormData({ name: '', institution_name: '', type: 'Renda Fixa' });
            else if (activeTab === 'banks') setFormData({ name: '', code: '' });
            else setFormData({ name: '' }); // revenue_accounts e outros
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData, user_id: user?.id };
            // clean up joined data (relations object)
            if (payload.banks) delete payload.banks;

            if (editingItem) {
                const { error } = await supabase.from(activeTab).update(payload).eq('id', editingItem.id);
                if (error) throw error;
                showToast('Registro atualizado com sucesso!', 'success');
            } else {
                const { error } = await supabase.from(activeTab).insert([payload]);
                if (error) throw error;
                showToast('Novo registro salvo com sucesso!', 'success');
            }
            setModalOpen(false);
            await loadData();
        } catch (error: any) {
            console.error('ERRO Salvar:', error);
            showToast('Erro ao salvar: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'banks', label: 'Bancos', icon: Landmark, count: data.banks.length },
        { id: 'bank_accounts', label: 'Contas Bancárias', icon: Wallet, count: data.bank_accounts.length },
        { id: 'expense_accounts', label: 'Cat. Despesas', icon: Tag, count: data.expense_accounts.length },
        { id: 'revenue_accounts', label: 'Cat. Receitas', icon: Tag, count: data.revenue_accounts.length },
        { id: 'investment_accounts', label: 'Contas Invest.', icon: TrendingUp, count: data.investment_accounts.length },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 relative">

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-[999] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-red-600 text-white shadow-red-600/20'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cadastros</h1>
                <p className="text-gray-500">Gestão de domínios estruturais</p>
            </div>

            {/* Abas e Painéis */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 p-2 border-b border-gray-100 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <button onClick={() => openModal()} className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <Plus size={16} />
                            <span>Novo</span>
                        </button>
                    </div>

                    {loadingData ? (
                        <div className="py-12"><Spinner /></div>
                    ) : data[activeTab].length === 0 ? (
                        <div className="py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-2xl">
                            Nenhum registro encontrado. Crie um novo ou utilize o Seed acima para preencher automaticamente.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                                        <th className="py-3 px-4 font-medium">Nome / Descrição</th>
                                        {activeTab === 'bank_accounts' && <th className="py-3 px-4 font-medium">Banco Vinculado</th>}
                                        {activeTab === 'investment_accounts' && <th className="py-3 px-4 font-medium">Tipo</th>}
                                        {activeTab === 'expense_accounts' && <th className="py-3 px-4 font-medium">Natureza</th>}
                                        <th className="py-3 px-4 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data[activeTab].map((row: any) => (
                                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-4 font-medium text-gray-900">
                                                {row.name}
                                                {row.code && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs">{row.code}</span>}
                                            </td>

                                            {activeTab === 'bank_accounts' && (
                                                <td className="py-4 px-4 text-gray-600">{row.banks?.name || '-'}</td>
                                            )}
                                            {activeTab === 'investment_accounts' && (
                                                <td className="py-4 px-4 text-gray-600">
                                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold">{row.type}</span>
                                                </td>
                                            )}
                                            {activeTab === 'expense_accounts' && (
                                                <td className="py-4 px-4">
                                                    {row.kind === 'fixa' ? (
                                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">Despesa Fixa</span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-semibold">Variável</span>
                                                    )}
                                                </td>
                                            )}

                                            <td className="py-4 px-4 text-right space-x-2">
                                                <button onClick={() => openModal(row)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(activeTab, row.id, row.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Formulário */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingItem ? 'Editar Registro' : 'Novo Registro'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Descrição</label>
                                    <input
                                        type="text" required
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>

                                {activeTab === 'banks' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Código do Banco (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.code || ''}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        />
                                    </div>
                                )}

                                {activeTab === 'bank_accounts' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Banco Vinculado</label>
                                            <select
                                                required
                                                value={formData.bank_id || ''}
                                                onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                                            >
                                                <option value="">Selecione um banco...</option>
                                                {data.banks.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
                                                <select
                                                    value={formData.type || ''}
                                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                                                >
                                                    <option>Conta Corrente</option>
                                                    <option>Poupança</option>
                                                    <option>Carteira</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inic. (R$)</label>
                                                <CurrencyInput
                                                    id="initial_balance"
                                                    name="initial_balance"
                                                    placeholder="R$ 0,00"
                                                    decimalsLimit={2}
                                                    decimalSeparator=","
                                                    groupSeparator="."
                                                    prefix="R$ "
                                                    value={formData.initial_balance || 0}
                                                    onValueChange={(value) => setFormData({ ...formData, initial_balance: value ? parseFloat(value.replace(',', '.')) : 0 })}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'expense_accounts' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Natureza da Despesa</label>
                                        <select
                                            value={formData.kind || ''}
                                            onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                                        >
                                            <option value="variavel">Variável (Lazer, Mercado...)</option>
                                            <option value="fixa">Fixa (Aluguel, Luz...)</option>
                                        </select>
                                    </div>
                                )}

                                {activeTab === 'investment_accounts' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Instituição (Corretora/Banco)</label>
                                            <input
                                                type="text" required
                                                value={formData.institution_name || ''}
                                                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Investimento</label>
                                            <select
                                                value={formData.type || ''}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                                            >
                                                <option>Renda Fixa</option>
                                                <option>Ações/FIIs</option>
                                                <option>Criptomoedas</option>
                                                <option>Previdência</option>
                                                <option>Outros</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex space-x-3">
                                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-70">
                                        {saving ? 'Aguarde...' : 'Salvar'}
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
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Registro?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Tem certeza que quer excluir <strong>{confirmDelete.name}</strong>? Essa operação não pode ser desfeita. (Se houver lançamentos atrelados a ele, a exclusão será bloqueada).
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={processDelete} className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm shadow-red-600/30">
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

