import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  InputAdornment,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  Search,
  Printer,
  FileSpreadsheet,
  ArrowLeft,
  DollarSign,
  CreditCard,
  AlertCircle,
  MapPin,
  Phone,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import ExcelJS from 'exceljs';

// Import Firebase và các file utils
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { taiCongNo, clearCongNoCache, formatCustomerId } from '../utils/taiCongNo';
import { importCongNoExcel } from '../utils/importCongNoExcel';
import { xuatExcelCongNo } from '../utils/xuatExcelCongNo';
import { printCongNo } from '../utils/printCongNo';

// Import Dialog chỉnh sửa & Dialog Xóa
import SuaGiaoDichCongNo from '../dialogs/SuaGiaoDichCongNo';
import XacNhanXoaDialog from "../dialogs/XacNhanXoaDialog";

/**
 * Hàm chuẩn hóa văn bản tiếng Việt triệt để
 */
const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .trim()
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

/**
 * Hàm chuyển đổi số tiền chuẩn
 */
const parseNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleanStr = String(val).replace(/[^0-9\-]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export default function CongNoKhachHang({ onBack }) {
  const [items, setItems] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref cho input file Excel ẩn
  const fileInputRef = useRef(null);

  // State quản lý Dialog Sửa
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // State quản lý Dialog Xác nhận Xóa
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // State quản lý Phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Quản lý Snackbar thông báo
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // 1. TẢI DỮ LIỆU BAN ĐẦU
  const initLoad = async (force = false) => {
    try {
      setLoading(true);
      setItems([]); 
      setPage(0);

      if (force) {
        clearCongNoCache();
      }

      const { customersMap: cMap, items: loadedItems } = await taiCongNo('ALL', force);
      setCustomersMap(cMap || {});

      const listFromCollection = Object.keys(cMap || {});
      let firstCust = '';
      if (listFromCollection.length > 0) {
        firstCust = listFromCollection[0];
      } else if (loadedItems && loadedItems.length > 0) {
        const fallbackSet = new Set();
        loadedItems.forEach(i => { if (i.customer && i.customer.trim()) fallbackSet.add(i.customer.trim()); });
        const arr = Array.from(fallbackSet);
        if (arr.length > 0) firstCust = arr[0];
      }

      let targetCustToLoad = selectedCustomer;
      if (!targetCustToLoad || targetCustToLoad === '') {
        targetCustToLoad = firstCust ? firstCust : 'ALL';
        setSelectedCustomer(targetCustToLoad);
      }

      if (targetCustToLoad === 'ALL' || targetCustToLoad === 'all') {
        setItems(loadedItems || []);
      } else {
        const targetCustNorm = normalizeText(targetCustToLoad);
        const filteredCustItems = (loadedItems || []).filter(
          item => normalizeText(item.customer) === targetCustNorm
        );
        setItems(filteredCustItems);
      }

      if (force) {
        setSnackbar({
          open: true,
          message: "Đã làm mới và tải lại dữ liệu từ CONGNO thành công!",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu khởi tạo:", error);
      setSnackbar({
        open: true,
        message: "Lỗi tải dữ liệu từ Firestore CONGNO!",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initLoad(false);
  }, []);

  const loadData = async (cust) => {
    try {
      setLoading(true);
      setItems([]);
      setPage(0);
      
      const { customersMap: cMap, items: loadedItems } = await taiCongNo(cust);
      setCustomersMap(cMap || {});
      setItems(loadedItems || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFromFirestore = async () => {
    await initLoad(true);
  };

  // --- XỬ LÝ NHẬP FILE EXCEL ---
  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setSnackbar({
        open: true,
        message: "Đang đọc và lưu tệp Excel vào CONGNO...",
        severity: "info",
      });

      const importedData = await importCongNoExcel(file);

      setSnackbar({
        open: true,
        message: `Đã nhập thành công ${importedData?.length || 0} dòng giao dịch lên Firestore!`,
        severity: "success",
      });

      await initLoad(true);
    } catch (error) {
      console.error("Lỗi khi nhập file Excel:", error);
      setSnackbar({
        open: true,
        message: `Lỗi khi nhập Excel: ${error.message || 'Tệp không hợp lệ!'}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  // Lấy và sắp xếp danh sách khách hàng A-Z cho Select menu
  const customerList = useMemo(() => {
    const listFromCollection = Object.keys(customersMap);
    let rawList = [];

    if (listFromCollection.length === 0) {
      const fallbackList = new Set();
      items.forEach(item => {
        if (item.customer && item.customer.trim() !== '') {
          fallbackList.add(item.customer.trim());
        }
      });
      rawList = Array.from(fallbackList);
    } else {
      rawList = listFromCollection;
    }

    return rawList.sort((a, b) =>
      a.localeCompare(b, 'vi', { sensitivity: 'accent' })
    );
  }, [customersMap, items]);

  const handleCustomerChange = async (e) => {
    const newCust = e.target.value;
    setSelectedCustomer(newCust);
    setSearchTerm('');
    setPage(0);
    await loadData(newCust);
  };

  // --- XỬ LÝ SỬA & XÓA ---
  const handleEditRow = (item) => {
    setEditingItem(item);
    setOpenEditDialog(true);
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({ open: true, item: item });
  };

  const handleConfirmDelete = async () => {
    const targetItem = deleteDialog.item;
    if (!targetItem) return;

    // Mã nhận diện dòng cần xóa (hỗ trợ cả id cũ trans_... lẫn firebaseId mới)
    const targetId = targetItem.id || targetItem.firebaseId || targetItem.docId;
    const customerName = String(targetItem.customer || targetItem.customerName || '').trim().toUpperCase();
    let safeId = formatCustomerId(customerName);

    try {
      setLoading(true);

      let docRef = doc(db, "CONGNO", safeId);
      let docSnap = await getDoc(docRef);

      // Fallback tìm kiếm trong cache map nếu ID chuẩn không khớp trực tiếp
      if (!docSnap.exists()) {
        const cachedMapStr = localStorage.getItem("thuanphat_debt_customers_map_v1");
        if (cachedMapStr) {
          const cachedMap = JSON.parse(cachedMapStr);
          const foundKey = Object.keys(cachedMap).find(key => {
            const cName = cachedMap[key]?.customerName || cachedMap[key]?.name || '';
            return normalizeText(cName) === normalizeText(customerName) || key === safeId;
          });
          if (foundKey) {
            safeId = foundKey;
            docRef = doc(db, "CONGNO", safeId);
            docSnap = await getDoc(docRef);
          }
        }
      }

      if (!docSnap.exists()) {
        throw new Error(`Không tìm thấy dữ liệu khách hàng "${customerName}" trong CONGNO!`);
      }

      const data = docSnap.data();
      // Ưu tiên mảng transactions theo cấu trúc dữ liệu gốc
      const currentList = data.transactions || data.items || [];

      // 1. LỌC BỎ DÒNG GIAO DỊCH CẦN XÓA (Khớp chuẩn cả id, firebaseId và fallback index)
      const updatedList = currentList.filter((t, idx) => {
        const transId = t.id || t.firebaseId || `${safeId}_${idx}`;
        return transId !== targetId;
      });

      // 2. TÍNH LẠI CÁC CHỈ SỐ TÀI CHÍNH LŨY KẾ SAU KHI XÓA
      const newTotalAmount = updatedList.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      const newTotalPaid = updatedList.reduce((sum, row) => sum + (Number(row.paid) || 0), 0);
      const newCurrentDebt = newTotalAmount - newTotalPaid;

      // 3. GHI CẬP NHẬT TRỰC TIẾP LÊN FIRESTORE
      await updateDoc(docRef, {
        transactions: updatedList,
        totalAmount: newTotalAmount,
        totalPaid: newTotalPaid,
        currentDebt: newCurrentDebt,
        lastUpdated: Date.now()
      });

      // 4. CẬP NHẬT STATE TRÊN GIAO DIỆN HIỆN TẠI
      setItems(prev => prev.filter(i => (i.id || i.firebaseId || i.docId) !== targetId));

      // 🌟 5. CẬP NHẬT TRỰC TIẾP CONTEXT (SET CUSTOMERS MAP) ĐỂ TRANG TỔNG HỢP ĐỒNG BỘ TỨC THÌ
      if (typeof setCustomersMap === 'function') {
        setCustomersMap(prev => ({
          ...prev,
          [customerName]: {
            ...(prev[customerName] || {}),
            docId: safeId,
            customerName: customerName,
            totalAmount: newTotalAmount,
            totalPaid: newTotalPaid,
            currentDebt: newCurrentDebt,
            amountNum: newTotalAmount,
            paidNum: newTotalPaid,
            debtNum: newCurrentDebt,
            lastUpdated: Date.now()
          }
        }));
      }

      // 6. CẬP NHẬT CACHE LOCALSTORAGE CÁ NHÂN
      const transCacheKey = `thuanphat_debt_items_${safeId}_v1`;
      localStorage.setItem(transCacheKey, JSON.stringify(updatedList));

      const mapCacheKey = "thuanphat_debt_customers_map_v1";
      const cachedMapStr = localStorage.getItem(mapCacheKey);
      if (cachedMapStr) {
        let cachedMap = JSON.parse(cachedMapStr);
        if (cachedMap[safeId]) {
          cachedMap[safeId].totalAmount = newTotalAmount;
          cachedMap[safeId].totalPaid = newTotalPaid;
          cachedMap[safeId].currentDebt = newCurrentDebt;
          cachedMap[safeId].lastUpdated = Date.now();
          localStorage.setItem(mapCacheKey, JSON.stringify(cachedMap));
        }
      }

      // 7. LỌC BỎ DÒNG KHỎI CACHE TỔNG HỢP (ALL) ĐỂ ĐỒNG BỘ TỨC THÌ
      const allCacheKeys = ["thuanphat_debt_items_ALL_v1", "thuanphat_debt_items_v1"];
      allCacheKeys.forEach(cacheKey => {
        const cachedAllStr = localStorage.getItem(cacheKey);
        if (cachedAllStr) {
          try {
            let allItems = JSON.parse(cachedAllStr);
            if (Array.isArray(allItems)) {
              allItems = allItems.filter(t => {
                const tId = t.id || t.firebaseId;
                return tId !== targetId;
              });
              localStorage.setItem(cacheKey, JSON.stringify(allItems));
            }
          } catch (e) {
            console.warn(`Lỗi cập nhật cache ALL khi xóa:`, e);
          }
        }
      });

      setSnackbar({
        open: true,
        message: "Đã xóa giao dịch và đồng bộ công nợ thành công!",
        severity: "success",
      });

    } catch (error) {
      console.error("Lỗi khi xóa giao dịch:", error);
      setSnackbar({
        open: true,
        message: `Lỗi khi xóa: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, item: null });
    }
  };

  // LỌC VÀ SẮP XẾP DỮ LIỆU THEO NGÀY TĂNG DẦN
  const rawFilteredItems = useMemo(() => {
    const targetCust = normalizeText(selectedCustomer);
    const searchLower = normalizeText(searchTerm);

    const matched = items.filter((item) => {
      const itemCust = normalizeText(item.customer);

      const matchCustomer =
        selectedCustomer === "ALL" ||
        targetCust === "all" ||
        itemCust === targetCust;

      const matchSearch =
        !searchLower ||
        normalizeText(item.itemName).includes(searchLower) ||
        normalizeText(item.customer).includes(searchLower) ||
        normalizeText(item.date).includes(searchLower) ||
        normalizeText(item.note).includes(searchLower);

      return matchCustomer && matchSearch;
    });

    const parseDateToTimestamp = (dateStr) => {
      if (!dateStr) return 0;
      const str = String(dateStr).trim();
      const parts = str.split(/[\/\-\.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const d = new Date(str);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        } else {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        }
      }
      const parsed = Date.parse(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    return matched.sort((a, b) => {
      const timeA = a.timestamp || parseDateToTimestamp(a.date);
      const timeB = b.timestamp || parseDateToTimestamp(b.date);
      return timeA - timeB;
    });
  }, [items, selectedCustomer, searchTerm]);

  // ĐÁNH STT VÀ TÍNH SỐ DƯ CÒN LẠI LŨY KẾ
  const filteredItems = useMemo(() => {
    let runningDebt = 0;
    return rawFilteredItems.map((item, index) => {
      const amount = parseNumber(item.amount);
      const paid = parseNumber(item.paid);
      
      runningDebt = runningDebt + amount - paid;

      return {
        ...item,
        stt: index + 1,
        amountNum: amount,
        paidNum: paid,
        debt: runningDebt
      };
    });
  }, [rawFilteredItems]);

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const totalAmount = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.amountNum, 0);
  }, [filteredItems]);

  const totalPaid = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.paidNum, 0);
  }, [filteredItems]);

  const lastDebt = totalAmount - totalPaid;

  const handleExportExcel = () => {
    xuatExcelCongNo({
      filteredItems,
      selectedCustomer,
      totalAmount,
      totalPaid,
      lastDebt,
      setSnackbar
    });
  };

  const formatMoney = (val) => {
    if (!val && val !== 0) return '-';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '-';
    if (num < 0) return `(${Math.abs(num).toLocaleString('vi-VN')})`;
    return num.toLocaleString('vi-VN');
  };

  const headerSx = {
    bgcolor: "#dbeafe",
    color: "#1e40af",
    fontWeight: 800,
    fontSize: "0.82rem",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    px: 1,
    py: 1.25,
    border: "1px solid #93c5fd",
  };

  const cellSx = {
    px: 1,
    py: 0.85,
    fontSize: "0.8rem",
    verticalAlign: "middle",
    border: "1px solid #e2e8f0",
  };

  const numberSx = {
    ...cellSx,
    textAlign: "right",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        p: { xs: 1, sm: 2 },
        color: '#334155',
        bgcolor: '#f1f5f9',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Input File ẩn hỗ trợ Nhập Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: { xs: 2, sm: 3 },
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#fff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.045)',
          boxSizing: 'border-box',
        }}
      >
        {/* THANH CÔNG CỤ BAN ĐẦU: NÚT THAO TÁC (BÊN TRÁI) & BADGE SỐ KHÁCH HÀNG (BÊN PHẢI) */}
        <Box
          sx={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {/* CÁC NÚT HÀNH ĐỘNG CĂN TRÁI */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title={loading ? "Đang làm mới..." : "Làm mới dữ liệu"}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleRefreshFromFirestore}
                  disabled={loading}
                  sx={{
                    bgcolor: '#2563eb',
                    color: '#fff',
                    '&:hover': { bgcolor: '#1d4ed8' },
                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    width: 32,
                    height: 32,
                  }}
                >
                  {loading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
                </IconButton>
              </span>
            </Tooltip>

            {/* NÚT NHẬP EXCEL */}
            {/*<Tooltip title="Nhập Excel vào Firestore">
              <span>
                <IconButton
                  size="small"
                  onClick={handleImportExcelClick}
                  disabled={loading}
                  sx={{
                    bgcolor: '#16a34a',
                    color: '#fff',
                    '&:hover': { bgcolor: '#15803d' },
                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    width: 32,
                    height: 32,
                  }}
                >
                  <Upload size={16} />
                </IconButton>
              </span>
            </Tooltip>*/}

            {/* NÚT XUẤT EXCEL */}
            <Tooltip title="Xuất Excel">
              <IconButton
                size="small"
                onClick={handleExportExcel}
                sx={{
                  bgcolor: '#0d9488',
                  color: '#fff',
                  '&:hover': { bgcolor: '#0f766e' },
                  width: 32,
                  height: 32,
                }}
              >
                <Download size={16} />
              </IconButton>
            </Tooltip>

            {/* NÚT IN BẢNG */}
            <Tooltip title="In Bảng Công Nợ">
              <IconButton
                size="small"
                onClick={() => printCongNo({
                  filteredItems,
                  selectedCustomer,
                  totalAmount,
                  totalPaid,
                  lastDebt
                })}
                sx={{
                  border: '1px solid #64748b',
                  color: '#475569',
                  '&:hover': { bgcolor: '#f1f5f9' },
                  width: 32,
                  height: 32,
                }}
              >
                <Printer size={16} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* TIÊU ĐỀ TRANG (ĐÃ CHUYỂN LÊN CÙNG HÀNG) */}
          <Typography
            sx={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#1e3a8a',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              m: 0,
              textAlign: 'center',
              flexGrow: 1,
            }}
          >
            BẢNG CÔNG NỢ KHÁCH HÀNG
          </Typography>

          {/* BADGE THỐNG KÊ SỐ KHÁCH HÀNG (CĂN BÊN PHẢI) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 'auto',
            }}
          >
            {loading && <CircularProgress size={16} />}
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: '#0369a1',
                bgcolor: '#f0f9ff',
                px: 2,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid #bae6fd',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <Users size={15} color="#0284c7" />
              {Object.keys(customersMap).length} Khách hàng
            </Box>
          </Box>
        </Box>

        {/* BỘ LỌC TÊN KHÁCH HÀNG */}
        <Box sx={{ width: '100%', textAlign: 'center', mb: 3, mt: -1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>
              Tên khách hàng:
            </Typography>
            <FormControl size="small" sx={{ width: { xs: 'auto', sm: 220 }, minWidth: { xs: 120, sm: 220 } }}>
              <Select
                value={selectedCustomer}
                onChange={handleCustomerChange}
                displayEmpty
                autoWidth
                sx={{
                  fontWeight: 700,
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  height: 32,
                  bgcolor: '#fef2f2',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fca5a5' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ef4444' },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: '0.85rem' }}><i>-- Tất cả Khách hàng --</i></MenuItem>
                {customerList.map((cust) => (
                  <MenuItem key={cust} value={cust} sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {cust}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Ô TÌM KIẾM (BÊN TRÁI) & NHÓM THỐNG KÊ CÔNG NỢ KPI (BÊN PHẢI) */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', md: 'flex-end' }, 
            gap: 2, 
            mb: 2.5 
          }}
        >
          <TextField
            size="small"
            placeholder="Tìm kiếm ngày, tên hàng, ghi chú..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            sx={{
              width: { xs: '100%', sm: 300 },
              '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.85rem', bgcolor: '#fff' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94a3b8" />
                </InputAdornment>
              ),
            }}
          />

          {/* NHÓM THỐNG KÊ CÔNG NỢ BÊN PHẢI */}
          <Box 
            sx={{ 
              maxWidth: 800, 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
              gap: 1.5,
              width: { xs: '100%', md: 'auto' }
            }}
          >
            <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #cbd5e1', borderRadius: 1.5, display: 'flex', alignItems: 'center', bgcolor: '#f8fafc' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Tổng Tiền Mua Hàng
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', mt: 0.25 }}>
                  {totalAmount.toLocaleString('vi-VN')} VNĐ
                </Typography>
              </Box>
              <Box sx={{ p: 0.75, bgcolor: '#eff6ff', color: '#1d4ed8', borderRadius: 1, ml: 1 }}>
                <DollarSign size={18} />
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #bbf7d0', borderRadius: 1.5, display: 'flex', alignItems: 'center', bgcolor: '#f0fdf4' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  Đã Thanh Toán
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a', mt: 0.25 }}>
                  {totalPaid.toLocaleString('vi-VN')} VNĐ
                </Typography>
              </Box>
              <Box sx={{ p: 0.75, bgcolor: '#dcfce7', color: '#16a34a', borderRadius: 1, ml: 1 }}>
                <CreditCard size={18} />
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #fecdd3', borderRadius: 1.5, display: 'flex', alignItems: 'center', bgcolor: '#fff1f2' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#be123c', textTransform: 'uppercase' }}>
                  Dư Nợ Hiện Tại
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: '#e11d48', mt: 0.25 }}>
                  {lastDebt.toLocaleString('vi-VN')} VNĐ
                </Typography>
              </Box>
              <Box sx={{ p: 0.75, bgcolor: '#ffe4e6', color: '#e11d48', borderRadius: 1, ml: 1 }}>
                <AlertCircle size={18} />
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* BẢNG CÔNG NỢ KHÁCH HÀNG */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            width: '100%',
            overflowX: "auto",
            maxHeight: 650,
            "&::-webkit-scrollbar": { height: 8, width: 8 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 10 },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              minWidth: 1320,
              tableLayout: "fixed",
              "& .MuiTableCell-root": { borderColor: "#cbd5e1" },
            }}
          >
            <colgroup>
              {[45, 90, 135, 185, 70, 50, 95, 105, 105, 110, 160, 80].map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>

            <TableHead>
              <TableRow>
                {[
                  "STT", "Ngày", "Khách hàng", "Tên hàng", "ĐVT", "SLg", "Đơn giá", "Thành tiền", "Thanh toán", "Còn lại", "Ghi chú", "Thao tác"
                ].map((label) => (
                  <TableCell key={label} sx={headerSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 1 }}>
                      Đang xử lý dữ liệu...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item, idx) => (
                  <TableRow key={item.firebaseId || `row_${idx}_${item.date}`} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e40af', bgcolor: '#f0f9ff' }}>
                      {item.stt}
                    </TableCell>
                    <TableCell align="center" sx={{ ...cellSx, color: '#334155', fontSize: '0.78rem', fontWeight: 600 }}>
                      {item.date || '—'}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 600, color: '#1e293b' }}>
                      {item.customer}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 700, color: '#0f172a' }}>
                      {item.itemName}
                    </TableCell>
                    <TableCell align="center" sx={cellSx}>
                      {item.unit || '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 700 }}>
                      {item.qty || '—'}
                    </TableCell>
                    <TableCell sx={numberSx}>
                      {formatMoney(item.price)}
                    </TableCell>
                    <TableCell sx={{ ...numberSx, fontWeight: 700, color: '#1e3a8a' }}>
                      {formatMoney(item.amountNum)}
                    </TableCell>
                    <TableCell sx={{ ...numberSx, fontWeight: 700, color: '#16a34a' }}>
                      {formatMoney(item.paidNum)}
                    </TableCell>
                    <TableCell sx={{ ...numberSx, fontWeight: 800, color: item.debt < 0 ? '#16a34a' : '#dc2626' }}>
                      {formatMoney(item.debt)}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: '#475569', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      {item.note || '—'}
                    </TableCell>
                    {/* CỘT THAO TÁC SỬA / XÓA */}
                    <TableCell align="center" sx={cellSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Sửa giao dịch">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRow(item)}
                            sx={{ color: '#0288d1', p: 0.5, '&:hover': { bgcolor: '#e0f2fe' } }}
                          >
                            <Edit size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa giao dịch">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(item)}
                            sx={{ color: '#dc2626', p: 0.5, '&:hover': { bgcolor: '#fee2e2' } }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                    <FileSpreadsheet size={48} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
                      Chưa có dữ liệu công nợ
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* DÒNG TỔNG CỘNG HỆ THỐNG */}
              {filteredItems.length > 0 && (
                <TableRow sx={{ bgcolor: "#eff6ff" }}>
                  <TableCell colSpan={7} sx={{ ...cellSx, fontWeight: 800, color: "#1e40af", textAlign: "right", textTransform: "uppercase" }}>
                    TỔNG CỘNG HỆ THỐNG:
                  </TableCell>
                  <TableCell sx={{ ...numberSx, fontWeight: 800, color: "#1e3a8a", fontSize: '0.85rem' }}>
                    {formatMoney(totalAmount)}
                  </TableCell>
                  <TableCell sx={{ ...numberSx, fontWeight: 800, color: "#15803d", fontSize: '0.85rem' }}>
                    {formatMoney(totalPaid)}
                  </TableCell>
                  <TableCell sx={{ ...numberSx, fontWeight: 900, color: "#b91c1c", fontSize: '0.85rem', bgcolor: '#fee2e2' }}>
                    {formatMoney(lastDebt)}
                  </TableCell>
                  <TableCell colSpan={2} sx={cellSx} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* THANH PHÂN TRANG UI */}
        {filteredItems.length > 0 && (
          <TablePagination
            component="div"
            count={filteredItems.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} trong tổng số ${count}`}
            sx={{
              borderTop: '1px solid #cbd5e1',
              bgcolor: '#f8fafc',
              borderRadius: '0 0 8px 8px',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#475569',
              },
            }}
          />
        )}
      </Paper>

      {/* DIALOG XÁC NHẬN XÓA GIAO DỊCH */}
      <XacNhanXoaDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        item={deleteDialog.item}
        onConfirm={handleConfirmDelete}
      />

      {/* DIALOG SỬA GIAO DỊCH */}
      <SuaGiaoDichCongNo
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        item={editingItem}
        onSuccess={() => {
          loadData(selectedCustomer);
        }}
      />

      {/* SNACKBAR THÔNG BÁO */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600, fontSize: "0.85rem" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}