import React, { createContext, useContext, useState, useCallback } from 'react';

const CACHE_KEY_MAP = "thuanphat_debt_customers_map_v1";
const CACHE_KEY_ITEMS = "thuanphat_debt_items_v1";

export const formatCustomerId = (name) => {
  if (!name) return "KHACH_LE";
  return String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
};

export const clearCongNoCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_MAP);
    localStorage.removeItem(CACHE_KEY_ITEMS);
  } catch (e) {
    console.warn("Lỗi xóa cache:", e);
  }
};

const CongNoContext = createContext();

export const CongNoProvider = ({ children }) => {
  // Khởi tạo State ban đầu bằng cách đọc trực tiếp từ localStorage
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY_ITEMS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [customersMap, setCustomersMap] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY_MAP);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');

  /**
   * Cập nhật toàn bộ dữ liệu mới (Ví dụ khi Component chính tải xong từ Firestore truyền vào)
   */
  const updateCongNoData = useCallback((newMap, newItems) => {
    const updatedMap = newMap || {};
    const updatedItems = newItems || [];

    setCustomersMap(updatedMap);
    setItems(updatedItems);

    try {
      localStorage.setItem(CACHE_KEY_MAP, JSON.stringify(updatedMap));
      localStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(updatedItems));
    } catch (e) {
      console.warn("Lỗi lưu dữ liệu vào localStorage:", e);
    }
  }, []);

  /**
   * Thêm hoặc cập nhật thông tin khách hàng phát sinh vào State & LocalStorage
   */
  const addCustomer = useCallback((customerName, details = {}) => {
    if (!customerName || !customerName.trim()) return;
    const nameUpper = customerName.trim().toUpperCase();

    setCustomersMap((prevMap) => {
      const existing = prevMap[nameUpper] || {
        customerName: nameUpper,
        totalAmount: 0,
        totalPaid: 0,
        currentDebt: 0,
      };

      const updatedMap = {
        ...prevMap,
        [nameUpper]: {
          ...existing,
          ...details,
          customerName: nameUpper,
        }
      };

      try {
        localStorage.setItem(CACHE_KEY_MAP, JSON.stringify(updatedMap));
      } catch (e) {
        console.warn("Không thể cập nhật cache map:", e);
      }

      return updatedMap;
    });
  }, []);

  /**
   * Thêm giao dịch mới phát sinh vào State & LocalStorage
   */
  const addTransactionItem = useCallback((newTransaction) => {
    if (!newTransaction) return;

    setItems((prevItems) => {
      const updatedItems = [newTransaction, ...prevItems];
      updatedItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      try {
        localStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(updatedItems));
      } catch (e) {
        console.warn("Không thể cập nhật cache items:", e);
      }

      return updatedItems;
    });
  }, []);

  const value = {
    items,
    setItems,
    customersMap,
    setCustomersMap,
    selectedCustomer,
    setSelectedCustomer,
    loading,
    setLoading,
    saving,
    setSaving,
    fileName,
    setFileName,
    updateCongNoData, // Hàm nhận dữ liệu mới từ Component chính để lưu trữ
    clearCongNoCache,
    addCustomer,
    addTransactionItem,
  };

  return (
    <CongNoContext.Provider value={value}>
      {children}
    </CongNoContext.Provider>
  );
};

export const useCongNo = () => {
  const context = useContext(CongNoContext);
  if (!context) {
    throw new Error('useCongNo phải được sử dụng bên trong CongNoProvider');
  }
  return context;
};