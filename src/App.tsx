import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Wallet, PieChart, ArrowRightLeft, Settings, LogOut, BarChart3, TrendingUp, Sun, Moon } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { CadastrosPage } from './pages/Cadastros';
import { LancamentosPage } from './pages/Lancamentos';
import { DashboardPage } from './pages/Dashboard';
import { RelatoriosPage } from './pages/Relatorios';
import { InvestimentosPage } from './pages/Investimentos';

// --- AUTH PAGE ---
const AuthPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);
        const { error } = isLogin
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (error) {
            setErrorMsg(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-primary dark:text-indigo-400">
                    <Wallet size={48} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Resolve Minha Vida Financeira
                </h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl shadow-indigo-100 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-slate-700 transition-colors">
                    <form className="space-y-6" onSubmit={handleAuth}>
                        {errorMsg && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-sm font-medium">
                                {errorMsg}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                            <div className="mt-1">
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-gray-400 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Senha</label>
                            <div className="mt-1">
                                <input
                                    type="password" required
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-gray-400 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70 dark:ring-offset-slate-800">
                                {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                            </button>
                        </div>
                    </form>
                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary dark:text-indigo-400 hover:text-indigo-500 font-medium transition-colors">
                            {isLogin ? 'Criar uma conta' : 'Já tenho conta, entrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LAYOUT E ROUTER ---
const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: PieChart },
        { path: '/lancamentos', label: 'Lançamentos', icon: ArrowRightLeft },
        { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
        { path: '/investimentos', label: 'Investimentos', icon: TrendingUp },
        { path: '/cadastros', label: 'Cadastros', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50/50 dark:bg-slate-900 font-sans selection:bg-primary/20 transition-colors">

            {/* SIDEBAR DESKTOP */}
            <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-sm z-10 transition-all">
                <div className="p-6 flex items-center space-x-3 mb-4">
                    <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Wallet size={24} />
                    </div>
                    <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Financeiro</span>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {menuItems.map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <Link key={item.path} to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 ${active ? 'bg-primary text-white shadow-md shadow-indigo-100 dark:shadow-none' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200'
                                    }`}>
                                <item.icon size={20} className={active ? 'text-white' : 'text-gray-400 dark:text-slate-500'} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
                <div className="px-6 pb-2">
                    <button onClick={toggleTheme} className="flex items-center justify-between space-x-3 w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors">
                        <div className="flex items-center space-x-3">
                            {theme === 'dark' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
                            <span className="text-sm font-medium">Modo {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                        </div>
                    </button>
                </div>
                <div className="p-6 pt-2">
                    <button onClick={signOut} className="flex items-center space-x-3 w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-100 dark:hover:border-red-800/50 hover:text-red-600 dark:hover:text-red-400 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-red-700 dark:group-hover:text-red-400">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium overflow-hidden">Sair</p>
                        </div>
                        <LogOut size={18} className="text-gray-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER & CONTENT */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50/20 dark:bg-slate-900">
                <header className="lg:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40 transition-colors">
                    <div className="flex items-center space-x-3">
                        <div className="bg-primary p-2 rounded-xl text-white shadow-md">
                            <Wallet size={20} />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Financeiro</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            {theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
                        </button>
                        <button
                            onClick={signOut}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Sair"
                        >
                            <LogOut size={22} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full pb-20 lg:pb-0 hide-scrollbar">
                    {children}
                </div>

                {/* Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 pb-safe pt-2 z-50 flex justify-around items-center h-[72px] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] rounded-t-3xl transition-colors">
                    {menuItems.map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <Link key={item.path} to={item.path}
                                className={`flex flex-col items-center justify-center w-full space-y-1 transition-colors ${active ? 'text-primary dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}>
                                <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-primary/10 dark:bg-indigo-500/10 text-primary dark:text-indigo-400 scale-110 drop-shadow-sm' : 'bg-transparent text-gray-400 dark:text-slate-500'}`}>
                                    <item.icon size={22} className="transition-transform" strokeWidth={active ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] tracking-wide transition-all ${active ? 'font-bold opacity-100' : 'font-medium opacity-80'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </main>
        </div>
    );
};

const RootApp = () => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
                <div className="animate-spin text-primary dark:text-indigo-500">
                    <Wallet size={48} />
                </div>
            </div>
        );
    }

    if (!session) {
        return <AuthPage />;
    }

    return (
        <Router>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/lancamentos" element={<LancamentosPage />} />
                    <Route path="/relatorios" element={<RelatoriosPage />} />
                    <Route path="/investimentos" element={<InvestimentosPage />} />
                    <Route path="/cadastros" element={<CadastrosPage />} />
                    {/* Outras rotas seriam injetadas aqui */}
                </Routes>
            </AppLayout>
        </Router>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RootApp />
            </AuthProvider>
        </ThemeProvider>
    );
}
