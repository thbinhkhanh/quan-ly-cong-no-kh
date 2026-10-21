import { db } from "../firebase";
import { doc, getDoc, writeBatch } from "firebase/firestore";

/**
 * Chuẩn hóa tên khách hàng thành ID an toàn theo chuẩn "KH_..."
 * Ví dụ: "Thái Phạm" -> "KH_THAI_PHAM"
 */
export const formatCustomerId = (name) => {
  if (!name) return "KH_KHACH_LE";

  const raw = String(name).trim().toUpperCase();

  // Nếu đã có tiền tố KH_ rồi thì không thêm trùng lặp
  if (raw.startsWith("KH_")) {
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
  }

  // Chuẩn hóa tiếng Việt không dấu và ghép tiền tố KH_
  const normalized = String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  return `KH_${normalized}`;
};

/**
 * 1. Merge dữ liệu mới vào LocalStorage ngay lập tức (dùng mảng transactions)
 */
export const mergeCacheCongNo = (safeId, customerSummaryData, newTransactions) => {
  try {
    // Merge Map
    const cachedMapStr = localStorage.getItem("thuanphat_debt_customers_map_v1");
    let cachedMap = cachedMapStr ? JSON.parse(cachedMapStr) : {};
    cachedMap[safeId] = customerSummaryData;
    localStorage.setItem("thuanphat_debt_customers_map_v1", JSON.stringify(cachedMap));

    // Merge Transactions
    const cachedItemsStr = localStorage.getItem("thuanphat_debt_items_v1");
    let cachedItems = cachedItemsStr ? JSON.parse(cachedItemsStr) : [];
    const mergedItems = [...newTransactions, ...cachedItems];
    mergedItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    localStorage.setItem("thuanphat_debt_items_v1", JSON.stringify(mergedItems));
  } catch (e) {
    console.warn("Lỗi merge cache công nợ:", e);
  }
};

/**
 * 2. Hàm ghi Firestore chạy ngầm ở Background (Lưu theo cấu trúc transactions cũ)
 */
export const luuHoaDonFirestoreBackground = async (safeId, custName, customerSummaryData, newTransactions) => {
  try {
    const customerDocRef = doc(db, "CONGNO", safeId);
    const docSnap = await getDoc(customerDocRef);

    let oldTotalAmount = 0;
    let oldTotalPaid = 0;
    let oldCurrentDebt = 0;
    let existingTransactions = [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      oldTotalAmount = Number(data.totalAmount) || Number(data.tongMua) || 0;
      oldTotalPaid = Number(data.totalPaid) || Number(data.daTra) || 0;
      oldCurrentDebt = Number(data.currentDebt) || Number(data.duNo) || 0;
      
      // Ưu tiên đọc trường transactions, hỗ trợ fallback sang items nếu có
      const rawList = data.transactions || data.items || [];
      existingTransactions = Array.isArray(rawList) ? rawList : [];
    }

    // Tính toán số liệu thực tế chính xác trên Firestore
    const finalSummaryData = {
      ...customerSummaryData,
      totalAmount: oldTotalAmount + Number(customerSummaryData.addedAmount || 0),
      totalPaid: oldTotalPaid + Number(customerSummaryData.addedPaid || 0),
      currentDebt: oldCurrentDebt + Number(customerSummaryData.addedDebt || 0),
      transactions: [...newTransactions, ...existingTransactions], // 🌟 Dùng chuẩn trường transactions
    };

    // Dọn dẹp các trường tạm tính toán
    delete finalSummaryData.addedAmount;
    delete finalSummaryData.addedPaid;
    delete finalSummaryData.addedDebt;
    // Đảm bảo không dính trường items cũ nếu document chưa có
    delete finalSummaryData.items;

    const batch = writeBatch(db);
    batch.set(customerDocRef, finalSummaryData, { merge: true });
    await batch.commit();

    console.log(`[Firestore Background] Đã đồng bộ hóa đơn ${custName} theo cấu trúc transactions thành công!`);
  } catch (error) {
    console.error(`[Firestore Background ERROR] Lỗi đồng bộ hóa đơn ${custName}:`, error);
    throw error;
  }
};

/**
 * 3. Hàm chính gọi từ Form/Dialog (Trả kết quả tức thì)
 */
export const luuHoaDon = (hoaDonData, currentCustomersMap = {}) => {
  const {
    invoiceNo = `PXK-${Date.now().toString().slice(-6)}`,
    customerName,
    customerAddress = "",
    customerPhone = "",
    date = new Date().toLocaleDateString("vi-VN"),
    items = [],
    totalAmount = 0,
    paidAmount = 0,
    remainingDebt = 0,
  } = hoaDonData;

  const custName = String(customerName || "").trim().toUpperCase();
  if (!custName) {
    throw new Error("Vui lòng chọn hoặc nhập tên khách hàng!");
  }

  const validItems = items.filter(
    (row) => row && String(row.itemName || "").trim() !== ""
  );

  if (validItems.length === 0) {
    throw new Error("Phiếu xuất phải có ít nhất 1 sản phẩm / hàng hóa!");
  }

  const safeId = formatCustomerId(custName);
  const nowTimestamp = Date.now();

  // Lấy dữ liệu cũ từ Context/State hiện tại để tính toán Optimistic UI
  const existingCust = currentCustomersMap[safeId] || {};
  const oldTotalAmount = Number(existingCust.totalAmount || 0);
  const oldTotalPaid = Number(existingCust.totalPaid || 0);
  const oldCurrentDebt = Number(existingCust.currentDebt || 0);

  const newTotalAmount = oldTotalAmount + Number(totalAmount || 0);
  const newTotalPaid = oldTotalPaid + Number(paidAmount || 0);
  const newCurrentDebt = oldCurrentDebt + Number(remainingDebt || 0);

  // Tạo các giao dịch mới dưới dạng chuẩn transactions
  const newTransactions = validItems.map((row, index) => {
    const now = new Date(nowTimestamp + index);
    const formattedDate = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      now.getFullYear(),
    ].join('-');

    const formattedTime = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
      String(now.getMilliseconds()).padStart(3, '0'),
    ].join('-');

    const transDocId = `trans_${now.getTime()}_${index}`; // Giữ định dạng ID truyền thống hoặc firebaseId tùy ý
    const qty = Number(row.qty) || 0;
    const price = Number(row.price) || 0;
    const amount = Number(row.amount) || qty * price;

    return {
      id: transDocId, // 🌟 Chuẩn hóa trường id cho cấu trúc cũ
      firebaseId: transDocId,
      invoiceNo,
      customer: custName,
      date: String(date).trim(),
      timestamp: now.getTime(),
      itemName: String(row.itemName || "").trim(),
      unit: String(row.unit || "Bao").trim(),
      qty,
      price,
      amount,
      paid: index === 0 ? Number(paidAmount) || 0 : 0,
      debt: index === 0 ? Number(remainingDebt) || 0 : amount,
      note: String(row.note || "").trim(),
    };
  });

  const customerSummaryData = {
    docId: safeId,
    customerName: custName,
    address: customerAddress || existingCust.address || "",
    phone: customerPhone || existingCust.phone || "",
    totalAmount: newTotalAmount,
    totalPaid: newTotalPaid,
    currentDebt: newCurrentDebt,
    lastUpdated: nowTimestamp,
    lastDate: String(date).trim(),
    addedAmount: Number(totalAmount || 0),
    addedPaid: Number(paidAmount || 0),
    addedDebt: Number(remainingDebt || 0),
  };

  // A. MERGE CACHE LOCALSTORAGE NGAY LẬP TỨC
  mergeCacheCongNo(safeId, customerSummaryData, newTransactions);

  // B. KÍCH HOẠT GHI FIRESTORE CHẠY NỀN (KHÔNG AWAIT)
  luuHoaDonFirestoreBackground(safeId, custName, customerSummaryData, newTransactions)
    .catch((err) => {
      console.error("Lỗi đồng bộ ngầm Firestore:", err);
    });

  // C. TRẢ VỀ DỮ LIỆU TỨC THỜI CHO UI
  return {
    success: true,
    message: `Đã lưu thành công phiếu cho ${custName}!`,
    safeId,
    updatedCustomer: customerSummaryData,
    newTransactions,
  };
};