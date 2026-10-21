import React, { createContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  // Lấy dữ liệu khởi tạo từ localStorage để hiển thị ngay lập tức không bị trễ
  const [config, setConfig] = useState(() => {
    const localLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const localAccount = localStorage.getItem('account') || '';
    const localAccountType = localStorage.getItem('accountType') || (localAccount.toLowerCase().includes('thuận phát') ? 'thuanphat' : 'admin');
    
    return {
      loggedIn: localLoggedIn,
      account: localAccount,
      accountType: localAccountType, // 🌟 Biến lưu loại tài khoản: 'thuanphat' | 'admin'
    };
  });
  
  const [loading, setLoading] = useState(true);

  // Lắng nghe Firestore real-time
  useEffect(() => {
    const configDocRef = doc(db, 'CONFIG', 'config');

    const unsubscribe = onSnapshot(
      configDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const accType = data.accountType || (data.account?.toLowerCase().includes('thuận phát') ? 'thuanphat' : 'admin');
          
          setConfig((prev) => ({
            ...prev,
            loggedIn: Boolean(data.loggedIn),
            account: data.account || prev.account,
            accountType: accType,
          }));

          // Đồng bộ đệm vào localStorage
          if (data.loggedIn !== undefined) localStorage.setItem('loggedIn', data.loggedIn ? 'true' : 'false');
          if (data.account) localStorage.setItem('account', data.account);
          if (accType) localStorage.setItem('accountType', accType);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Lỗi Firestore Config:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Hàm cập nhật đồng bộ tức thì (Cập nhật State trước -> Lưu localStorage -> Đẩy Firestore)
  const updateConfig = async (newConfigData) => {
    // 1. Tính toán giá trị loại tài khoản nếu chưa có
    let accType = newConfigData.accountType;
    if (!accType && newConfigData.account) {
      accType = newConfigData.account.toLowerCase().includes('thuận phát') ? 'thuanphat' : 'admin';
    }

    const updatedData = {
      ...newConfigData,
      ...(accType ? { accountType: accType } : {}),
    };

    // 2. Cập nhật ngay lập tức React State nội bộ (không bị delay)
    setConfig((prev) => {
      const merged = { ...prev, ...updatedData };
      
      // Lưu ngay lập tức vào localStorage
      if (merged.loggedIn !== undefined) localStorage.setItem('loggedIn', merged.loggedIn ? 'true' : 'false');
      if (merged.account) localStorage.setItem('account', merged.account);
      if (merged.accountType) localStorage.setItem('accountType', merged.accountType);

      return merged;
    });

    // 3. Đẩy thông tin cấu hình lên Firestore
    try {
      const configDocRef = doc(db, 'CONFIG', 'config');
      await setDoc(configDocRef, updatedData, { merge: true });
    } catch (err) {
      console.error('Lỗi ghi Firestore CONFIG/config:', err);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig, updateConfig, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};