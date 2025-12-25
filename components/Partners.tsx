import React, { useState } from 'react';
import { Partner } from '../types';
import { Plus, Search, Edit2, Trash2, X, Phone, MapPin, UserPlus } from 'lucide-react';

interface PartnersProps {
  partners: Partner[];
  onAddPartner: (partner: Partner) => void;
  onUpdatePartner: (partner: Partner) => void;
  onDeletePartner: (id: string) => void;
}

export const Partners: React.FC<PartnersProps> = ({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<Partner>>({});
  const [isEdit, setIsEdit] = useState(false);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.contact && p.contact.includes(searchTerm))
  );

  const handleOpenAdd = () => {
    setEditingPartner({ type: 'CUSTOMER' });
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner({ ...partner });
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      onUpdatePartner(editingPartner as Partner);
    } else {
      onAddPartner({
        ...editingPartner as Partner,
        id: Date.now().toString()
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 px-2 lg:px-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">거래처 관리</h1>
          <p className="text-sm text-slate-500 font-medium">입출고가 발생하는 모든 업체 목록</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          거래처 등록
        </button>
      </header>

      <div className="px-2 lg:px-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="거래처명, 연락처 검색..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 lg:px-0">
        {filteredPartners.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">등록된 거래처가 없습니다.</p>
          </div>
        ) : (
          filteredPartners.map(partner => (
            <div key={partner.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-300 transition-colors group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                    partner.type === 'SUPPLIER' ? 'bg-amber-100 text-amber-700' : 
                    partner.type === 'CUSTOMER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {partner.type === 'SUPPLIER' ? '공급처' : partner.type === 'CUSTOMER' ? '고객사' : '기타'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900">{partner.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(partner)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDeletePartner(partner.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {partner.contact && (
                  <div className="flex items-center text-slate-600">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    {partner.contact}
                  </div>
                )}
                {partner.address && (
                  <div className="flex items-center text-slate-600">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    {partner.address}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 backdrop-blur-sm p-0 lg:p-4">
          <div className="bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up lg:animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-black">{isEdit ? '거래처 수정' : '새 거래처 등록'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-xl"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">업체명</label>
                  <input type="text" required value={editingPartner.name || ''} onChange={e => setEditingPartner({...editingPartner, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">구분</label>
                    <select value={editingPartner.type || 'CUSTOMER'} onChange={e => setEditingPartner({...editingPartner, type: e.target.value as any})}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                      <option value="SUPPLIER">공급처 (매입)</option>
                      <option value="CUSTOMER">고객사 (매출)</option>
                      <option value="BOTH">둘 다 해당</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">연락처</label>
                    <input type="text" value={editingPartner.contact || ''} onChange={e => setEditingPartner({...editingPartner, contact: e.target.value})}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">주소</label>
                  <input type="text" value={editingPartner.address || ''} onChange={e => setEditingPartner({...editingPartner, address: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">비고</label>
                  <textarea value={editingPartner.note || ''} onChange={e => setEditingPartner({...editingPartner, note: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold h-24 resize-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-4">
                거래처 정보 저장
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};