export enum TransactionType {
  IN = 'IN',   // 입고
  OUT = 'OUT'  // 출고
}

export interface Partner {
  id: string;
  name: string;
  contact?: string;
  type: 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
  address?: string;
  note?: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  safetyStock: number; 
  price: number;
  lastUpdated: string;
}

// 개별 탱크(자산) 정보
export interface Asset {
  id: string;          // 내부 관리 ID
  itemId: string;      // 부모 품목 ID (예: 9인치 탱크 ID)
  signalNumber: string; // 실제 각인된 시그널 넘버
  status: 'AVAILABLE' | 'SHIPPED'; // 재고있음 | 출고됨
  partnerId?: string;  // 현재 위치(거래처)
  registeredAt: string;
}

export interface Log {
  id: string;
  itemId: string;
  itemName: string;
  assetId?: string;        // 어떤 시그널 넘버가 움직였는지
  signalNumber?: string;   // 시그널 넘버 텍스트
  partnerId?: string;
  partnerName?: string;
  type: TransactionType;
  quantity: number;
  timestamp: string;
  note?: string;
}

export interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
}