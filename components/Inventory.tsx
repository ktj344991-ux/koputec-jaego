
import React, { useState, useRef, useMemo } from 'react';
import { Item, TransactionType, Log, Partner, Asset } from '../types';
import { CATEGORIES } from '../constants';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  QrCode,
  Printer,
  Hash,
  ShieldCheck, 
  AlertCircle,
  Camera,
  Zap,
  Package,
  Truck,
  Building2,
  Check
} from 'lucide-react';

interface InventoryProps {
  items: Item[];
  logs: Log[];
  partners: Partner[];
  assets: Asset[];
  onTransaction: (itemId: string, type: TransactionType, quantity: number, partnerId: string, note: string, assetId?: string) => void;
  onAddItem: (item: Item) => void;
  onUpdateItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onRegisterAsset: (itemId: string, signalNumber: string, partnerId?: string) => void;
  onDeleteAsset: (assetId: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  items, 
  logs,
  partners,
  assets,
  onTransaction, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem,
  onRegisterAsset,
  onDeleteAsset
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);

  // Transaction States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>(TransactionType.IN);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [scannedSignal, setScannedSignal] = useState('');
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item>>({});
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [assetTab, setAssetTab] = useState<'AVAILABLE' | 'SHIPPED'>('AVAILABLE');
  const [newSignalNumber, setNewSignalNumber] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<{name: string, signal: string, category: string} | null>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPartners = useMemo(() => {
    return partners.filter(p => 
      p.name.toLowerCase().includes(partnerSearchTerm.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(partnerSearchTerm.toLowerCase()))
    );
  }, [partners, partnerSearchTerm]);

  // 스캐너 제어
  const startScanner = async (item: Item, type: TransactionType) => {
    setSelectedItem(item);
    setTxType(type);
    setCameraError(null);
    setIsScannerOpen(true);
    
    setTimeout(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("카메라를 활성화할 수 없습니다. 장치 연결이나 권한 설정을 확인해주세요.");
        }
    }, 100);
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScannerOpen(false);
    setCameraError(null);
  };

  const handleScanSuccess = (code: string) => {
    stopScanner();
    setScannedSignal(code);
    setSelectedPartnerId('');
    setPartnerSearchTerm('');
    setSelectedAssetId('');
    
    if (txType === TransactionType.OUT && selectedItem?.category === '탱크' && code) {
      const matchingAsset = assets.find(a => a.signalNumber === code && a.status === 'AVAILABLE' && a.itemId === selectedItem.id);
      if (matchingAsset) {
        setSelectedAssetId(matchingAsset.id);
      }
    }
    
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!selectedPartnerId) {
      alert('거래처를 선택해 주세요.');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const note = formData.get('note') as string;
    const finalSignal = scannedSignal.trim();
    
    if (selectedItem.category === '탱크') {
      if (!finalSignal) {
        alert('탱크 제품은 시그널 넘버 입력이 필수입니다.');
        return;
      }

      if (txType === TransactionType.IN) {
        onRegisterAsset(selectedItem.id, finalSignal, selectedPartnerId);
      } else {
        const assetIdToShip = selectedAssetId || assets.find(a => a.signalNumber === finalSignal && a.status === 'AVAILABLE' && a.itemId === selectedItem.id)?.id;
        if (assetIdToShip) {
          onTransaction(selectedItem.id, TransactionType.OUT, 1, selectedPartnerId, note, assetIdToShip);
        } else {
          alert('출고 가능한 해당 시그널 넘버를 창고 재고에서 찾을 수 없습니다.');
          return;
        }
      }
    } else {
      const qty = parseInt(formData.get('quantity') as string, 10);
      onTransaction(selectedItem.id, txType, qty, selectedPartnerId, note);
    }

    setIsTxModalOpen(false);
    setScannedSignal('');
    setSelectedItem(null);
  };

  const handlePrintQR = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0 animate-fade-in">
      {/* QR Scanner Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
            {!cameraError && <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />}
            
            <div className="relative z-10 flex flex-col items-center w-full px-6 text-center">
                <div className="mb-8">
                    <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-bold text-sm mb-2">
                        <QrCode className="w-4 h-4 mr-2" />
                        {txType === TransactionType.IN ? '입고 스캔' : '출고 스캔'}
                    </div>
                    <h2 className="text-2xl font-black text-white">{selectedItem?.name}</h2>
                    {cameraError ? (
                        <p className="text-rose-400 text-sm mt-1 font-bold">{cameraError}</p>
                    ) : (
                        <p className="text-white/60 text-sm mt-1">
                        {selectedItem?.category === '탱크' ? '탱크의 시그널 넘버 QR 코드를 스캔하세요' : '품목 바코드를 스캔하세요'}
                        </p>
                    )}
                </div>

                {/* Scan Area UI */}
                <div className="relative w-64 h-64 mb-12">
                    <div className="absolute inset-0 border-2 border-white/20 rounded-3xl"></div>
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                    <div className="absolute left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse" style={{ top: '50%' }}></div>
                    
                    {cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <AlertCircle className="w-12 h-12 text-white/20" />
                        </div>
                    )}
                </div>

                <div className="flex gap-4 w-full max-w-xs">
                    <button onClick={stopScanner} className="flex-1 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold border border-white/10 active:scale-95 transition-all">취소</button>
                    <button onClick={() => handleScanSuccess('SN-' + Math.floor(Math.random() * 9000 + 1000))} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all">
                        {cameraError ? '수동 입력 진행' : '시뮬레이션 스캔'}
                    </button>
                </div>
            </div>

            <button className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white backdrop-blur-md" onClick={() => setIsFlashOn(!isFlashOn)}>
                <Zap className={`w-6 h-6 ${isFlashOn ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
        </div>
      )}

      <header className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 px-2 lg:px-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">재고 관리</h1>
          <p className="text-sm text-slate-500 font-medium">실시간 자산 및 시그널 넘버 추적</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={() => { setEditingItem({category: '탱크', quantity: 0, safetyStock: 5, price: 0}); setSelectedItem(null); setIsEditModalOpen(true); }}
                className="flex-1 lg:flex-none flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> 품목 추가</span>
            </button>
        </div>
      </header>

      {/* Filter & Search */}
      <div className="space-y-3 px-2 lg:px-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="모델명 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-medium" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
              {cat === 'All' ? '전체' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-2 lg:px-0">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg mb-1 inline-block uppercase tracking-widest">{item.category}</span>
                  <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                </div>
                <button onClick={() => { setEditingItem(item); setSelectedItem(item); setIsEditModalOpen(true); }} className="p-2 text-slate-300 hover:text-slate-900"><Edit2 className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">
                    {item.category === '탱크' ? '실제 자산 재고' : '현재 재고'}
                  </div>
                  <div className={`text-2xl font-black ${item.quantity <= item.safetyStock ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity.toLocaleString()}개</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">단가</div>
                  <div className="text-xl font-black text-slate-900">{item.price.toLocaleString()}원</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {item.category === '탱크' && (
                <button onClick={() => { setSelectedItem(item); setIsAssetManagerOpen(true); setAssetTab('AVAILABLE'); }}
                  className="w-full py-3.5 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center hover:bg-indigo-100 transition-colors">
                  <Hash className="w-4 h-4 mr-2" /> 시그널 넘버 목록
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={() => startScanner(item, TransactionType.IN)} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center">
                    <Camera className="w-4 h-4 mr-2" /> 입고
                </button>
                <button onClick={() => startScanner(item, TransactionType.OUT)} className="flex-1 py-3.5 bg-orange-600 text-white rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center">
                    <Camera className="w-4 h-4 mr-2" /> 출고
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Signal Number Manager Modal */}
      {isAssetManagerOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedItem.name}</h3>
                <p className="text-xs font-bold text-slate-400 tracking-tight">시그널 넘버 통합 관리 시스템</p>
              </div>
              <button onClick={() => setIsAssetManagerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex p-2 bg-slate-100 gap-1 mx-6 mt-4 rounded-2xl">
              <button 
                onClick={() => setAssetTab('AVAILABLE')}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 rounded-xl font-black transition-all ${assetTab === 'AVAILABLE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Package className="w-4 h-4" />
                <span>재고 현황 ({assets.filter(a => a.itemId === selectedItem.id && a.status === 'AVAILABLE').length})</span>
              </button>
              <button 
                onClick={() => setAssetTab('SHIPPED')}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 rounded-xl font-black transition-all ${assetTab === 'SHIPPED' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Truck className="w-4 h-4" />
                <span>출고 내역 ({assets.filter(a => a.itemId === selectedItem.id && a.status === 'SHIPPED').length})</span>
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <form onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedItem && newSignalNumber.trim()) {
                      onRegisterAsset(selectedItem.id, newSignalNumber.trim());
                      setNewSignalNumber('');
                  } else {
                      alert('시그널 넘버를 입력해주세요.');
                  }
              }} className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="새로운 시그널 넘버 기초 재고 등록" value={newSignalNumber} onChange={e => setNewSignalNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                </div>
                <button type="submit" className="px-8 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">등록</button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {assets.filter(a => a.itemId === selectedItem.id && a.status === assetTab).length === 0 ? (
                <div className="py-20 text-center space-y-4">
                    <div className="flex justify-center">
                      {assetTab === 'AVAILABLE' ? <Package className="w-12 h-12 text-slate-200" /> : <Truck className="w-12 h-12 text-slate-200" />}
                    </div>
                    <p className="text-slate-400 font-bold">{assetTab === 'AVAILABLE' ? '창고에 재고가 없습니다.' : '출고된 내역이 없습니다.'}</p>
                </div>
              ) : (
                assets.filter(a => a.itemId === selectedItem.id && a.status === assetTab).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors group">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {asset.status === 'AVAILABLE' ? <ShieldCheck className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{asset.signalNumber}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {asset.status === 'AVAILABLE' ? '창고 보관 중' : '출고 처리됨'} • {new Date(asset.registeredAt).toLocaleDateString()}
                        </div>
                        {asset.partnerId && (
                           <div className="text-[10px] font-black text-indigo-500 mt-1">
                             거래처: {partners.find(p => p.id === asset.partnerId)?.name || '알 수 없음'}
                           </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => { setQrAsset({name: selectedItem.name, signal: asset.signalNumber, category: selectedItem.category}); setIsQRModalOpen(true); }}
                        className="p-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors" title="QR 코드">
                        <QrCode className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        className="p-3 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="삭제">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isTxModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up lg:animate-fade-in flex flex-col max-h-[90vh]">
                <div className={`p-6 text-white font-black flex items-center justify-between flex-shrink-0 ${txType === TransactionType.IN ? 'bg-blue-600' : 'bg-orange-600'}`}>
                    <span>{txType === TransactionType.IN ? '입고 상세 처리' : '출고 상세 처리'}</span>
                    <button onClick={() => setIsTxModalOpen(false)}><X /></button>
                </div>
                
                <form onSubmit={handleTxSubmit} className="p-8 space-y-5 overflow-y-auto no-scrollbar flex-1">
                    {selectedItem.category === '탱크' ? (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">시그널 넘버 확인/수정</label>
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus-within:border-indigo-500 transition-all">
                            <Hash className="w-5 h-5 text-slate-400" />
                            <input 
                              type="text" 
                              value={scannedSignal} 
                              onChange={(e) => setScannedSignal(e.target.value)} 
                              placeholder="번호를 입력하세요"
                              required
                              className="w-full bg-transparent font-black text-lg outline-none text-slate-900"
                            />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className={`p-3 rounded-xl ${txType === TransactionType.IN ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                              <QrCode className="w-6 h-6" />
                          </div>
                          <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">인식된 코드</div>
                              <div className="text-lg font-black text-slate-900">{scannedSignal || '코드 정보 없음'}</div>
                          </div>
                      </div>
                    )}

                    {/* Partner Search & Selection UI */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">거래처 검색 및 선택</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="거래처명 또는 지역 검색..." 
                                value={partnerSearchTerm}
                                onChange={(e) => setPartnerSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 no-scrollbar">
                            {filteredPartners.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm font-bold italic">검색 결과가 없습니다.</div>
                            ) : (
                                filteredPartners.map(p => (
                                    <button 
                                        key={p.id} 
                                        type="button"
                                        onClick={() => setSelectedPartnerId(p.id)}
                                        className={`w-full p-4 flex items-center justify-between text-left transition-all hover:bg-slate-50 ${selectedPartnerId === p.id ? 'bg-indigo-50' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${selectedPartnerId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className={`font-black text-sm ${selectedPartnerId === p.id ? 'text-indigo-900' : 'text-slate-900'}`}>{p.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{p.address || '주소 정보 없음'}</div>
                                            </div>
                                        </div>
                                        {selectedPartnerId === p.id && (
                                            <Check className="w-5 h-5 text-indigo-600" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                         <div className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-widest">품목 정보</div>
                         <div className="font-bold text-indigo-900 text-lg leading-tight">{selectedItem.name}</div>
                         <p className="text-[10px] text-indigo-600 mt-1 font-bold">
                           {selectedItem.category === '탱크' ? '탱크는 개별 시그널 넘버 기반으로 재고가 관리됩니다.' : '일반 품목은 수량을 직접 입력하세요.'}
                         </p>
                    </div>

                    {selectedItem.category !== '탱크' && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">처리 수량</label>
                            <input name="quantity" type="number" required defaultValue="1" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 transition-all" />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">비고 (메모)</label>
                        <input name="note" type="text" placeholder="특이사항 입력" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
                    </div>

                    <button type="submit" className={`w-full py-5 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex-shrink-0 ${txType === TransactionType.IN ? 'bg-blue-600 shadow-blue-600/20' : 'bg-orange-600 shadow-orange-600/20'}`}>
                        {txType === TransactionType.IN ? '입고 완료' : '출고 완료'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* QR Display Modal */}
      {isQRModalOpen && qrAsset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up print:shadow-none print:rounded-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between print:hidden">
              <h3 className="font-black text-slate-900">시그널 넘버 QR 라벨</h3>
              <button onClick={() => setIsQRModalOpen(false)} className="p-2 text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-10 flex flex-col items-center space-y-6 text-center">
              <div className="bg-white p-4 border-2 border-slate-100 rounded-3xl shadow-sm">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrAsset.signal)}`}
                     alt="Signal QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block">{qrAsset.category}</span>
                <h4 className="text-2xl font-black text-slate-900 leading-tight">{qrAsset.name}</h4>
                <div className="flex items-center justify-center space-x-2 text-slate-500 font-bold bg-slate-50 px-4 py-2 rounded-xl mt-3 border border-slate-100">
                  <Hash className="w-4 h-4" />
                  <span>{qrAsset.signal}</span>
                </div>
              </div>
              <button onClick={handlePrintQR} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center print:hidden active:scale-95 transition-all">
                <Printer className="w-4 h-4 mr-2" /> 라벨 인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Edit Modal */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up lg:animate-fade-in">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xl font-black text-slate-900">{selectedItem ? '품목 정보 수정' : '새 품목 등록'}</h3>
                      <button onClick={() => setIsEditModalOpen(false)}><X /></button>
                  </div>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      if (selectedItem) onUpdateItem(editingItem as Item);
                      else onAddItem({...editingItem, id: Date.now().toString(), lastUpdated: new Date().toISOString()} as Item);
                      setIsEditModalOpen(false);
                  }} className="p-8 space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-widest">품목명</label>
                          <input type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-widest">카테고리</label>
                            <select value={editingItem.category || '기타'} onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-widest">단가</label>
                            <input type="number" value={editingItem.price || 0} onChange={e => setEditingItem({...editingItem, price: parseInt(e.target.value)})} required
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
                          </div>
                      </div>
                      <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">저장하기</button>
                      {selectedItem && (
                          <button type="button" onClick={() => { onDeleteItem(selectedItem.id); setIsEditModalOpen(false); }} className="w-full py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-colors">품목 삭제</button>
                      )}
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
