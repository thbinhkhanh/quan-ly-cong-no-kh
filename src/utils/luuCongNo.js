import { db } from "../firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

/**
 * Hàm tạo Document ID an toàn không dấu, không khoảng trắng cho Firestore
 * Ví dụ: "QUÁO CHÚ 9 CHỀ" -> "KH_QUAO_CHU_9_CHE"
 */
export const formatCustomerId = (name) => {
  if (!name) return "KH_KHAC_LE";
  const cleanStr = String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
  
  return cleanStr.startsWith("KH_") ? cleanStr : `KH_${cleanStr}`;
};

/**
 * GHI DỮ LIỆU ĐỒNG BỘ THEO CẤU TRÚC MẢNG VÀO COLLECTION "CONGNO"
 * @param {Array} itemsData Mảng items nhận trực tiếp từ giao diện CongNoKhachHang.jsx
 */
export const luuCongNo = async (itemsData) => {
  if (!itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
    throw new Error("Giao diện không có dữ liệu để ghi lên Firestore!");
  }

  // BƯỚC A: Gom nhóm các dòng giao dịch theo Tên khách hàng chuẩn
  const customerMap = {};

  itemsData.forEach((item, idx) => {
    const custName = String(item.customer || 'KHÁCH LẺ').trim();
    if (!custName) return;

    if (!customerMap[custName]) {
      customerMap[custName] = {
        customerName: custName,
        phone: item.phone || '',
        totalAmount: 0,
        totalPaid: 0,
        currentDebt: 0,
        lastDate: item.date || '',
        transactions: []
      };
    }

    const cObj = customerMap[custName];
    const amount = Number(item.amount) || 0;
    const paid = Number(item.paid) || 0;

    cObj.totalAmount += amount;
    cObj.totalPaid += paid;
    cObj.currentDebt = Number(item.debt) || (cObj.totalAmount - cObj.totalPaid);

    // Chuẩn hóa item trước khi lưu vào mảng transactions
    const cleanDate = String(item.date || '').trim();
    const transId = item.firebaseId || item.id || `trans_${Date.now()}_${idx}`;

    cObj.transactions.push({
      id: transId,
      customer: custName,
      date: cleanDate,
      timestamp: Number(item.timestamp) || Date.now(),
      itemName: String(item.itemName || '').trim(),
      unit: String(item.unit || '').trim(),
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      amount: amount,
      paid: paid,
      debt: Number(item.debt) || 0,
      note: String(item.note || '').trim()
    });
  });

  const customerList = Object.keys(customerMap);
  console.log(`[Firestore] Bắt đầu ghi cấu trúc mảng cho ${customerList.length} khách hàng vào collection CONGNO...`);

  // BƯỚC B: Ghi từng Document Khách hàng (chứa mảng transactions) vào collection "CONGNO"
  const chunkSize = 400; 
  for (let i = 0; i < customerList.length; i += chunkSize) {
    const chunk = customerList.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((custName) => {
      const custData = customerMap[custName];
      const safeId = formatCustomerId(custName);
      const custRef = doc(db, "CONGNO", safeId);

      // Sắp xếp mảng giao dịch theo thời gian tăng dần trước khi lưu
      custData.transactions.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      batch.set(custRef, {
        customerName: custData.customerName,
        phone: custData.phone,
        totalAmount: custData.totalAmount,
        totalPaid: custData.totalPaid,
        currentDebt: custData.currentDebt,
        lastDate: custData.lastDate,
        lastUpdated: Date.now(),
        transactions: custData.transactions
      }, { merge: true });
    });

    await batch.commit();
    console.log(`[Firestore] Đã lưu thành công batch ${Math.floor(i / chunkSize) + 1} vào CONGNO`);
  }
};

/**
 * XÓA TẤT CẢ DỮ LIỆU TRONG COLLECTION "CONGNO" (Dùng khi cần Reset/Làm sạch)
 */
export const xoaToanBoCongNoFirestore = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "CONGNO"));
    const docs = querySnapshot.docs;

    if (docs.length === 0) return;

    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    }

    console.log("[Firestore] Đã xóa toàn bộ dữ liệu trong collection CONGNO.");
  } catch (error) {
    console.error("Lỗi khi xóa toàn bộ dữ liệu công nợ:", error);
    throw error;
  }
};