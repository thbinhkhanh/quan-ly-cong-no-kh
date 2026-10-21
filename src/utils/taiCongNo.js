import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const CACHE_KEY_MAP = "thuanphat_debt_customers_map_v1";
const CACHE_KEY_ITEMS = "thuanphat_debt_items_v1";
const CACHE_TIME_KEY = "thuanphat_debt_cache_time_v1";

/**
 * Chuẩn hóa tên khách hàng thành ID an toàn (khớp với luuCongNo).
 */
export const formatCustomerId = (name) => {
  if (!name) return "KH_KHACH_LE";
  const raw = String(name).trim().toUpperCase();
  if (raw.startsWith("KH_")) {
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
  }
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
 * Chuẩn hóa tên để so sánh.
 */
const normalizeCustomerName = (name) => {
  return String(name || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Tải dữ liệu công nợ từ collection "CONGNO" trên Firestore.
 * - ALL: trả về toàn bộ khách hàng và giao dịch.
 * - forceRefresh = true: bỏ qua cache và tải lại trực tiếp từ Firestore.
 * - updateContextFn: (Tùy chọn) Hàm cập nhật State/Context.
 */
export const taiCongNo = async (
  targetCustomerName = "ALL",
  forceRefresh = false,
  updateContextFn = null
) => {
  let custMap = {};
  let allItems = [];

  const targetName = String(targetCustomerName || "ALL").trim();
  const isAll =
    targetName.toUpperCase() === "ALL" ||
    targetName === "";

  const normalizedTarget = normalizeCustomerName(targetName);
  const targetSafeId = formatCustomerId(targetName);

  // 1. Chỉ sử dụng cache khi yêu cầu lấy ALL và không ép buộc làm mới
  if (isAll && !forceRefresh) {
    try {
      const cachedMap = localStorage.getItem(CACHE_KEY_MAP);
      const cachedItems = localStorage.getItem(CACHE_KEY_ITEMS);

      if (cachedMap && cachedItems) {
        const parsedMap = JSON.parse(cachedMap);
        const parsedItems = JSON.parse(cachedItems);

        if (
          parsedMap &&
          typeof parsedMap === "object" &&
          Array.isArray(parsedItems)
        ) {
          console.log(`[Cache CONGNO] Đã tải ${parsedItems.length} giao dịch.`);

          if (typeof updateContextFn === "function") {
            updateContextFn(parsedMap, parsedItems);
          }

          return {
            customersMap: parsedMap,
            items: parsedItems,
          };
        }
      }
    } catch (error) {
      console.warn("Lỗi đọc cache công nợ:", error);
    }
  }

  // 2. Lấy dữ liệu từ collection "CONGNO" trên Firestore
  console.log(
    isAll
      ? "Đang tải toàn bộ dữ liệu từ collection CONGNO trên Firestore..."
      : `Đang tải công nợ khách hàng từ collection CONGNO: ${targetName}...`
  );

  try {
    const congNoSnapshot = await getDocs(collection(db, "CONGNO"));

    console.log(
      `Tổng số bản ghi khách hàng trong collection CONGNO: ${congNoSnapshot.docs.length}`
    );

    congNoSnapshot.docs.forEach((docSnapshot) => {
      const docData = docSnapshot.data() || {};
      const rawCustName = docData.customer || docData.customerName || docSnapshot.id;
      const custName = String(rawCustName).trim().toUpperCase();
      
      // Mảng giao dịch lưu bên trong document (hỗ trợ cả items và transactions)
      const rawTransactions = docData.items || docData.transactions || [];
      const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

      custMap[custName] = {
        ...docData,
        docId: docSnapshot.id,
        customerName: custName,
      };

      // Đưa các giao dịch của khách hàng này vào mảng tổng
      transactions.forEach((trans, index) => {
        if (trans && typeof trans === 'object') {
          allItems.push({
            ...trans,
            firebaseId: trans.firebaseId || `${docSnapshot.id}_${index}`,
            customer: custName,
          });
        }
      });
    });

    // 3. Nếu không phải lấy ALL, tiến hành lọc theo tên hoặc safeId yêu cầu
    if (!isAll) {
      allItems = allItems.filter((item) => {
        const itemCust = String(item.customer || "").trim().toUpperCase();
        const normItemCust = normalizeCustomerName(itemCust);
        const safeItemCustId = formatCustomerId(itemCust);

        return (
          normItemCust === normalizedTarget ||
          safeItemCustId === targetSafeId
        );
      });
    }

    // 4. Sắp xếp giao dịch theo thời gian giảm dần
    allItems.sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    // 5. Chỉ lưu cache khi tải ALL
    if (isAll) {
      try {
        localStorage.setItem(
          CACHE_KEY_MAP,
          JSON.stringify(custMap)
        );

        localStorage.setItem(
          CACHE_KEY_ITEMS,
          JSON.stringify(allItems)
        );

        localStorage.setItem(
          CACHE_TIME_KEY,
          String(Date.now())
        );
      } catch (error) {
        console.warn("Không thể lưu cache công nợ:", error);
      }
    }

    // 6. Cập nhật trực tiếp vào Context nếu có hàm
    if (typeof updateContextFn === "function") {
      updateContextFn(custMap, allItems);
    }

    return {
      customersMap: custMap,
      items: allItems,
    };

  } catch (error) {
    console.error("Lỗi khi tải dữ liệu từ collection CONGNO:", error);
    return {
      customersMap: {},
      items: [],
    };
  }
};

/**
 * Xóa cache công nợ để tải lại dữ liệu.
 */
export const clearCongNoCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY_MAP);
    localStorage.removeItem(CACHE_KEY_ITEMS);
    localStorage.removeItem(CACHE_TIME_KEY);

    console.log("Đã xóa cache công nợ thành công!");
  } catch (error) {
    console.warn("Lỗi xóa cache công nợ:", error);
  }
};