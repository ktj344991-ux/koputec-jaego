
import React, { useState, useMemo } from 'react';
import { Log, TransactionType } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Calendar, 
  Building2, 
  FileText, 
  X, 
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Copy,
  Check,
  Zap
} from 'lucide-react';

interface HistoryProps {
  logs: Log[];
}

export const History: React.FC<HistoryProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateReport, setSelectedDateReport] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 검색 필터링
  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (log.partnerName && log.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.note && log.note.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [logs, searchTerm]);

  // 날짜별 그룹화 로직
  const groupedLogs = useMemo(() => {
    const groups: Record<string, { logs: Log[], inCount: number, outCount: number }> = {};
    
    filteredLogs.forEach(log => {
      const date = log.timestamp.split('T')[0];
      if (!groups[date]) {
        groups[date] = { logs: [], inCount: 0, outCount: 0 };
      }
      groups[date].logs.push(log);
      if (log.type === TransactionType.IN) groups[date].inCount += log.quantity;
      else groups[date].outCount += log.quantity;
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredLogs]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return {
      full: d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
      date: d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  };

  const handlePrint = () => {
    // 인쇄 실행 전 약간의 지연을 주어 모달 렌더링을 확실히 함
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // 입출고장용 데이터 (기초 재고 등록 제외 및 특정 품목별 집계)
  const reportData = useMemo(() => {
    if (!selectedDateReport) return null;
    const group = groupedLogs.find(g => g[0] === selectedDateReport)?.[1];
    if (!group) return null;

    // '기초 재고 등록'을 제외한 순수 입출고 로그 필터링
    const operationalLogs = group.logs.filter(log => log.note !== '기초 재고 등록')
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    // 9인치 순수탱크 집계
    const tank9In = operationalLogs.filter(l => l.itemName === '9인치 순수탱크' && l.type === TransactionType.IN).reduce((sum, l) => sum + l.quantity, 0);
    const tank9Out = operationalLogs.filter(l => l.itemName === '9인치 순수탱크' && l.type === TransactionType.OUT).reduce((sum, l) => sum + l.quantity, 0);
    
    // 12인치 순수탱크 집계
    const tank12In = operationalLogs.filter(l => l.itemName === '12인치 순수탱크' && l.type === TransactionType.IN).reduce((sum, l) => sum + l.quantity, 0);
    const tank12Out = operationalLogs.filter(l => l.itemName === '12인치 순수탱크' && l.type === TransactionType.OUT).reduce((sum, l) => sum + l.quantity, 0);

    return { 
      logs: operationalLogs, 
      tank9: { in: tank9In, out: tank9Out },
      tank12: { in: tank12In, out: tank12Out }
    };
  }, [selectedDateReport, groupedLogs]);

  // 엑셀 복사용 TSV 생성 기능 (요청에 따라 구분, 품목명, 거래처, 수량만 반영)
  const copyToExcel = () => {
    if (!reportData) return;
    
    // 요청하신 4개 헤더 정의
    const headers = ['구분', '품목명', '거래처', '수량'];
    
    // 데이터 행 생성 (4개 열만 추출)
    const rows = reportData.logs.map(log => [
      log.type === TransactionType.IN ? '입고' : '출고',
      log.itemName,
      log.partnerName || '',
      log.quantity // 숫자로 전달하여 엑셀에서 수식 사용 가능케 함
    ]);

    // TSV 문자열 생성 (탭으로 구분)
    const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');

    // 클립보드 복사
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in">
      <header className="px-2 lg:px-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">입출고 이력</h1>
          <p className="text-sm text-slate-500 font-medium">재고 변동 내역 및 일일 보고서</p>
        </div>
      </header>

      <div className="relative px-2 lg:px-0">
        <Search className="absolute left-6 lg:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="품목명, 거래처, 메모 검색..." 
          className="w-full pl-14 lg:pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-8 px-2 lg:px-0">
        {groupedLogs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
             <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold">기록된 내역이 없습니다.</p>
          </div>
        ) : (
          groupedLogs.map(([date, data]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black tracking-tight">
                    {date}
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center text-blue-500"><TrendingUp className="w-3 h-3 mr-1" /> {data.inCount}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="flex items-center text-orange-500"><TrendingDown className="w-3 h-3 mr-1" /> {data.outCount}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDateReport(date)}
                  className="flex items-center text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  입출고장 보기
                </button>
              </div>

              <div className="space-y-2">
                {data.logs.map(log => {
                  const timeInfo = formatDate(log.timestamp);
                  return (
                    <div key={log.id} className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2.5 rounded-xl ${log.type === TransactionType.IN ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {log.type === TransactionType.IN ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                            {log.itemName}
                            {log.signalNumber && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">SN: {log.signalNumber}</span>
                            )}
                            {log.partnerName && (
                              <span className="inline-flex items-center text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">
                                <Building2 className="w-2.5 h-2.5 mr-1" />
                                {log.partnerName}
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                            {timeInfo.time} {log.note === '기초 재고 등록' && <span className="text-indigo-400 ml-2">[기초재고]</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-black ${log.type === TransactionType.IN ? 'text-blue-600' : 'text-orange-600'}`}>
                          {log.type === TransactionType.IN ? '+' : '-'}{log.quantity.toLocaleString()}
                        </div>
                        {log.note && <div className="text-[10px] text-slate-400 max-w-[100px] truncate font-medium">{log.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Daily Statement Modal */}
      {selectedDateReport && reportData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 print:p-0 print:bg-white overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl min-h-[60vh] flex flex-col animate-fade-in-up print:shadow-none print:rounded-none my-auto print-area">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between print-hide sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900">일일 입출고장 확인</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyToExcel}
                  className={`flex items-center px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    copySuccess 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  title="엑셀 전용 복사 (구분, 품목, 거래처, 수량)"
                >
                  {copySuccess ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copySuccess ? '복사 완료' : '엑셀용 데이터 복사'}
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-sm shadow-lg shadow-blue-600/20"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  PDF 저장 / 인쇄
                </button>
                <button 
                  onClick={() => setSelectedDateReport(null)} 
                  className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 lg:p-12 space-y-8 flex-1">
              {/* Report Header */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">일일 입출고 상세 내역서</h2>
                <p className="text-slate-500 font-bold">{formatDate(selectedDateReport).full}</p>
                <div className="w-20 h-1.5 bg-indigo-600 mx-auto rounded-full mt-4"></div>
                <p className="text-[10px] text-slate-400 font-bold print:block hidden uppercase tracking-widest pt-2">※ 기초 재고 등록 내역은 본 명세서에서 제외되었습니다.</p>
              </div>

              {/* Summary Tiles - Model Specific Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 9인치 탱크 요약 */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Zap className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> 9인치 순수탱크
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-blue-50">
                       <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter mb-1">입고 합계</div>
                       <div className="text-2xl font-black text-blue-600">{reportData.tank9.in.toLocaleString()} <span className="text-xs opacity-50">EA</span></div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-orange-50">
                       <div className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter mb-1">출고 합계</div>
                       <div className="text-2xl font-black text-orange-600">{reportData.tank9.out.toLocaleString()} <span className="text-xs opacity-50">EA</span></div>
                    </div>
                  </div>
                </div>

                {/* 12인치 탱크 요약 */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Zap className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> 12인치 순수탱크
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-blue-50">
                       <div className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter mb-1">입고 합계</div>
                       <div className="text-2xl font-black text-blue-600">{reportData.tank12.in.toLocaleString()} <span className="text-xs opacity-50">EA</span></div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-orange-50">
                       <div className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter mb-1">출고 합계</div>
                       <div className="text-2xl font-black text-orange-600">{reportData.tank12.out.toLocaleString()} <span className="text-xs opacity-50">EA</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table - Excel Friendly (Separated Columns) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">시간</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">구분</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">품목명</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">시그널넘버</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">거래처</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-20">수량</th>
                      <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic">당일 거래처 입출고 내역이 없습니다.</td>
                      </tr>
                    ) : (
                      reportData.logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-4 px-2 text-xs font-bold text-slate-500">{formatDate(log.timestamp).time}</td>
                          <td className="py-4 px-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                              log.type === TransactionType.IN ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {log.type === TransactionType.IN ? '입고' : '출고'}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-sm font-black text-slate-900">{log.itemName}</td>
                          <td className="py-4 px-2 text-xs font-bold text-slate-600">{log.signalNumber || '-'}</td>
                          <td className="py-4 px-2 text-xs font-bold text-slate-600">{log.partnerName || '-'}</td>
                          <td className={`py-4 px-2 text-right font-black ${log.type === TransactionType.IN ? 'text-blue-600' : 'text-orange-600'}`}>
                            {log.quantity.toLocaleString()}
                          </td>
                          <td className="py-4 px-2 text-[10px] text-slate-400 font-medium max-w-[150px] truncate">{log.note || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Footer */}
              <div className="pt-12 border-t border-slate-100 text-center space-y-4">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">위와 같이 일일 입출고 내역을 보고함</p>
                <div className="flex justify-center space-x-12">
                   <div className="text-center">
                      <div className="w-16 h-16 border-2 border-slate-100 rounded-2xl mb-2 mx-auto flex items-center justify-center text-[10px] font-black text-slate-300">담당자 인</div>
                      <p className="text-xs font-bold text-slate-500">작성자</p>
                   </div>
                   <div className="text-center">
                      <div className="w-16 h-16 border-2 border-slate-100 rounded-2xl mb-2 mx-auto flex items-center justify-center text-[10px] font-black text-slate-300">승인자 인</div>
                      <p className="text-xs font-bold text-slate-500">확인자</p>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest print-hide">
              SmartInven AI Inventory System • Generated on {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
