
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { History } from './components/History';
import { Partners } from './components/Partners';
import { Item, Log, TransactionType, Partner, Asset } from './types';
import { INITIAL_ITEMS, INITIAL_LOGS, INITIAL_PARTNERS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('inventory_items_v4');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [logs, setLogs] = useState<Log[]>(() => {
    const saved = localStorage.getItem('inventory_logs_v4');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('inventory_partners_v4');
    return saved ? JSON.parse(saved) : INITIAL_PARTNERS;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('inventory_assets_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const syncedItems = useMemo(() => {
    return items.map(item => {
      if (item.category === '탱크') {
        const availableCount = assets.filter(a => a.itemId === item.id && a.status === 'AVAILABLE').length;
        return { ...item, quantity: availableCount };
      }
      return item;
    });
  }, [items, assets]);

  useEffect(() => {
    localStorage.setItem('inventory_items_v4', JSON.stringify(items));
    localStorage.setItem('inventory_logs_v4', JSON.stringify(logs));
    localStorage.setItem('inventory_partners_v4', JSON.stringify(partners));
    localStorage.setItem('inventory_assets_v4', JSON.stringify(assets));
  }, [items, logs, partners, assets]);

  const handleImportData = (dataStr: string) => {
    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.items && parsed.logs && parsed.partners && parsed.assets) {
        setItems(parsed.items);
        setLogs(parsed.logs);
        setPartners(parsed.partners);
        setAssets(parsed.assets);
        alert('데이터가 성공적으로 복구되었습니다.');
      } else {
        throw new Error('올바른 백업 파일 형식이 아닙니다.');
      }
    } catch (e) {
      console.error(e);
      alert('데이터 복구에 실패했습니다. 유효한 JSON 파일을 선택해주세요.');
    }
  };

  const handleTransaction = (itemId: string, type: TransactionType, quantity: number, partnerId: string, note: string, assetId?: string) => {
    const targetItem = syncedItems.find(i => i.id === itemId);
    if (!targetItem) return;

    const partner = partners.find(p => p.id === partnerId);
    let signalNum = '';

    if (assetId) {
      setAssets(prev => prev.map(a => {
        if (a.id === assetId) {
          signalNum = a.signalNumber;
          return { ...a, status: type === TransactionType.OUT ? 'SHIPPED' : 'AVAILABLE', partnerId };
        }
        return a;
      }));
    }

    if (targetItem.category !== '탱크') {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: type === TransactionType.IN ? item.quantity + quantity : item.quantity - quantity,
            lastUpdated: new Date().toISOString()
          };
        }
        return item;
      }));
    } else {
      setItems(prevItems => prevItems.map(item => 
        item.id === itemId ? { ...item, lastUpdated: new Date().toISOString() } : item
      ));
    }

    const newLog: Log = {
      id: Date.now().toString(),
      itemId,
      itemName: targetItem.name,
      assetId,
      signalNumber: signalNum,
      partnerId: partner?.id,
      partnerName: partner?.name,
      type,
      quantity,
      timestamp: new Date().toISOString(),
      note
    };

    setLogs(prev => [newLog, ...prev]);
  };

  const handleRegisterAsset = (itemId: string, signalNumber: string, partnerId?: string) => {
    if (assets.some(a => a.signalNumber === signalNumber && a.status === 'AVAILABLE')) {
      alert('이미 등록되어 있는 활성 시그널 넘버입니다.');
      return;
    }

    const newAsset: Asset = {
      id: `as-${Date.now()}`,
      itemId,
      signalNumber,
      status: 'AVAILABLE',
      partnerId: partnerId,
      registeredAt: new Date().toISOString()
    };
    
    setAssets(prev => [...prev, newAsset]);
    
    const targetItem = items.find(i => i.id === itemId);
    const partner = partnerId ? partners.find(p => p.id === partnerId) : null;

    const newLog: Log = {
      id: `log-${Date.now()}`,
      itemId,
      itemName: targetItem?.name || '알 수 없는 품목',
      assetId: newAsset.id,
      signalNumber,
      partnerId: partner?.id,
      partnerName: partner?.name,
      type: TransactionType.IN,
      quantity: 1,
      timestamp: new Date().toISOString(),
      note: partnerId ? `입고 및 시그널 넘버 등록` : '기초 재고 등록'
    };
    setLogs(prev => [newLog, ...prev]);

    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, lastUpdated: new Date().toISOString() } : item
    ));
  };

  const handleDeleteAsset = (assetId: string) => {
    const assetToDelete = assets.find(a => a.id === assetId);
    if (!assetToDelete) return;

    if (window.confirm(`시그널 넘버 [${assetToDelete.signalNumber}]를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 재고 수량에서 즉시 제외됩니다.`)) {
      setAssets(prev => prev.filter(a => a.id !== assetId));

      const targetItem = items.find(i => i.id === assetToDelete.itemId);
      
      const newLog: Log = {
        id: `log-del-${Date.now()}`,
        itemId: assetToDelete.itemId,
        itemName: targetItem?.name || '알 수 없는 품목',
        type: TransactionType.OUT,
        quantity: 1,
        timestamp: new Date().toISOString(),
        note: `데이터 삭제: ${assetToDelete.signalNumber}`
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const handleAddItem = (newItem: Item) => {
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? { ...updatedItem, lastUpdated: new Date().toISOString() } : item));
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('품목을 삭제하면 등록된 모든 시그널 넘버 정보도 사라집니다. 계속하시겠습니까?')) {
      setItems(prev => prev.filter(item => item.id !== id));
      setAssets(prev => prev.filter(a => a.itemId !== id));
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <Dashboard 
          items={syncedItems} 
          logs={logs} 
          partners={partners}
          assets={assets}
          onImportData={handleImportData}
        />
      )}
      {activeTab === 'inventory' && (
        <Inventory 
          items={syncedItems} 
          logs={logs}
          partners={partners}
          assets={assets}
          onTransaction={handleTransaction} 
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onRegisterAsset={handleRegisterAsset}
          onDeleteAsset={handleDeleteAsset}
        />
      )}
      {activeTab === 'partners' && (
        <Partners 
          partners={partners}
          onAddPartner={(p) => setPartners(prev => [...prev, p])}
          onUpdatePartner={(p) => setPartners(prev => prev.map(old => old.id === p.id ? p : old))}
          onDeletePartner={(id) => setPartners(prev => prev.filter(p => p.id !== id))}
        />
      )}
      {activeTab === 'history' && <History logs={logs} />}
    </Layout>
  );
};

export default App;
