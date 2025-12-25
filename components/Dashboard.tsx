
import React, { useRef } from 'react';
import { Item, Log, DashboardStats, TransactionType, Partner, Asset } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, PackageCheck, DollarSign, Download, Upload, Database, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  items: Item[];
  logs: Log[];
  partners: Partner[];
  assets: Asset[];
  onImportData: (data: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ items, logs, partners, assets, onImportData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: DashboardStats = React.useMemo(() => {
    return {
      totalItems: items.length,
      totalQuantity: items.reduce((acc, curr) => acc + curr.quantity, 0),
      totalValue: items.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0),
      lowStockCount: items.filter(i => i.quantity <= i.safetyStock).length,
    };
  }, [items]);

  const categoryData = React.useMemo(() => {
    const data: Record<string, number> = {};
    items.forEach(item => {
      data[item.category] = (data[item.category] || 0) + item.quantity;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [items]);

  const lowStockItems = items.filter(i => i.quantity <= i.safetyStock);

  const activityData = React.useMemo(() => {
      const data = [
          { name: '입고', value: logs.filter(l => l.type === TransactionType.IN).length },
          { name: '출고', value: logs.filter(l => l.type === TransactionType.OUT).length }
      ];
      return data;
  }, [logs]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  // 데이터 내보내기 (JSON 다운로드)
  const handleExport = () => {
    const backupData = {
      items,
      logs,
      partners,
      assets,
      version: '4.0',
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartinven_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 데이터 가져오기 (파일 읽기)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (window.confirm('기존 데이터가 모두 삭제되고 불러온 파일의 데이터로 대체됩니다. 계속하시겠습니까?')) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
    // 동일 파일 재선택 가능하게 리셋
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="px-2 lg:px-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">대시보드</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">실시간 주요 지표 요약</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            백업하기
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-blue-500" /> 품목
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalItems}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> 수량
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalQuantity.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 col-span-2 lg:col-span-1">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> 자산 가치
          </div>
          <div className="text-xl font-black text-indigo-600 truncate">{formatCurrency(stats.totalValue)}</div>
        </div>
        <div className={`p-5 rounded-3xl shadow-sm border flex flex-col justify-between h-32 col-span-2 lg:col-span-1 ${stats.lowStockCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
          <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> 부족 알림
          </div>
          <div className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {stats.lowStockCount} <span className="text-sm font-bold opacity-50">건</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">카테고리별 분포</h3>
          <div className="h-56 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">입출고 밸런스</h3>
           <div className="h-56 lg:h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Database className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Data Safe Guard</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">데이터 영구 보관 및 관리</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                현재 데이터는 브라우저에 자동 저장되지만, 더 안전한 보관을 위해 파일로 백업할 수 있습니다. 
                중요한 작업 전후에는 반드시 백업 파일을 다운로드해 두세요.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleExport}
                className="flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-600/20"
              >
                <Download className="w-5 h-5 mr-2" />
                현재 데이터 내보내기
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-all active:scale-95 border border-slate-700"
              >
                <Upload className="w-5 h-5 mr-2" />
                백업 파일 불러오기
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800 flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3 h-3 mr-1" /> 실시간 자동 저장 활성</span>
            <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
            <span>최종 백업 권장: 주 1회</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert List */}
      {lowStockItems.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
          <div className="flex items-center space-x-2 mb-6">
             <AlertTriangle className="w-5 h-5 text-rose-500" />
             <h3 className="text-lg font-black text-slate-800 tracking-tight">재고 부족 리스트</h3>
          </div>
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.category} • 안전재고: {item.safetyStock}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-rose-600">{item.quantity}개</div>
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">RESTOCK NEEDED</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
