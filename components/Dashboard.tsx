
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
import { TrendingUp, AlertTriangle, PackageCheck, DollarSign, Download, Upload, Database, ShieldCheck, Share2 } from 'lucide-react';

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

  const activityData = React.useMemo(() => {
      const data = [
          { name: '입고', value: logs.filter(l => l.type === TransactionType.IN).length },
          { name: '출고', value: logs.filter(l => l.type === TransactionType.OUT).length }
      ];
      return data;
  }, [logs]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  // 데이터 생성 공통 로직
  const getBackupBlob = () => {
    const backupData = {
      items,
      logs,
      partners,
      assets,
      version: '4.0',
      timestamp: new Date().toISOString()
    };
    return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  };

  // 1. 데이터 내보내기 (다운로드)
  const handleExport = () => {
    const blob = getBackupBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartinven_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. 데이터 공유하기 (모바일 공유 창)
  const handleShare = async () => {
    const blob = getBackupBlob();
    const fileName = `inventory_share_${new Date().toISOString().split('T')[0]}.json`;
    const file = new File([blob], fileName, { type: 'application/json' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'SmartInven 재고 데이터 공유',
          text: '현재 재고 현황 데이터 파일입니다. 앱에서 불러오기를 통해 사용하세요.'
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      alert('이 브라우저는 파일 공유 기능을 지원하지 않습니다. [내보내기] 후 파일을 수동으로 전달해주세요.');
    }
  };

  // 3. 데이터 가져오기
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const lowStockItems = items.filter(i => i.quantity <= i.safetyStock);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="px-2 lg:px-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">대시보드</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">실시간 주요 지표 요약</p>
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
                <span className="text-xs font-black uppercase tracking-widest">Data & Collaboration</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">협업 및 데이터 관리</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                동료와 데이터를 공유하려면 [데이터 공유하기]를 눌러 파일을 전달하세요. 
                상대방은 전달받은 파일을 [불러오기]하면 동일한 내역을 확인할 수 있습니다.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
              <button 
                onClick={handleShare}
                className="flex items-center justify-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
              >
                <Share2 className="w-5 h-5 mr-2" />
                데이터 공유하기
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center justify-center px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-all active:scale-95 border border-slate-700"
              >
                <Download className="w-5 h-5 mr-2" />
                파일로 내보내기
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="col-span-1 sm:col-span-2 flex items-center justify-center px-6 py-4 bg-white text-slate-900 rounded-2xl font-black transition-all active:scale-95 border border-slate-200"
              >
                <Upload className="w-5 h-5 mr-2 text-blue-600" />
                공유받은 백업 파일 불러오기
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
            <span className="flex items-center text-emerald-400"><ShieldCheck className="w-3 h-3 mr-1" /> 로컬 스토리지 보관 중</span>
            <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
            <span>공유 팁: 카카오톡 전송 가능</span>
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
