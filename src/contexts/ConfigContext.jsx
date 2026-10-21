import React, { createContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  // Lấy dữ liệu khởi tạo từ sessionStorage để khi F5 không bị mất phiên đăng nhập
  const [config, setConfig] = useState(() => {
    const sessionLoggedIn = sessionStorage.getItem('loggedIn') === 'true';
    const sessionAccount = sessionStorage.getItem('account') || '';
    const sessionAccountType = sessionStorage.getItem('accountType') || (sessionAccount.toLowerCase().includes('thuận phát') ? 'thuanphat' : 'admin');
    
    return {
      loggedIn: sessionLoggedIn,
      account: sessionAccount,
      accountType: sessionAccountType, // 🌟 Biến lưu loại tài khoản: 'thuanphat' | 'admin'
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
            account: data.account || prev.account,
            accountType: accType,
          }));

          // Đồng bộ đệm vào sessionStorage (chỉ lưu trong phiên làm việc hiện tại)
          if (data.account) sessionStorage.setItem('account', data.account);
          if (accType) sessionStorage.setItem('accountType', accType);
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

  // Hàm cập nhật đồng bộ tức thì (Cập nhật State trước -> Lưu sessionStorage -> Đẩy Firestore)
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

    // 2. Cập nhật ngay lập tức React State nội bộ
    setConfig((prev) => {
      const merged = { ...prev, ...updatedData };
      
      // Lưu ngay lập tức vào sessionStorage
      if (merged.loggedIn !== undefined) sessionStorage.setItem('loggedIn', merged.loggedIn ? 'true' : 'false');
      if (merged.account) sessionStorage.setItem('account', merged.account);
      if (merged.accountType) sessionStorage.setItem('accountType', merged.accountType);

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