import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Snackbar,
  Alert,
  Stack,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Import Firebase và Firestore
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

/**
 * Hàm tạo Document ID an toàn chuẩn "KH_..."
 */
const formatCustomerId = (name) => {
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

export default function NoCu({ open, onClose, onSuccess }) {
  // Lấy định dạng ngày hiện tại DD/MM/YYYY
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [ngayChuyenNo, setNgayChuyenNo] = useState(getTodayFormatted());
  const [isSystemDate, setIsSystemDate] = useState(true);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [tongTienNoCu, setTongTienNoCu] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [loading, setLoading] = useState(false);

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

  // 1. Tải danh sách khách hàng từ collection "CONGNO" trên Firestore (kết hợp cache)
  useEffect(() => {
    if (open) {
      const fetchCustomers = async () => {
        try {
          // Thử lấy từ cache trước để hiển thị cực nhanh
          const cachedMapStr = localStorage.getItem("thuanphat_debt_customers_map_v1");
          if (cachedMapStr) {
            const cachedMap = JSON.parse(cachedMapStr);
            const listFromCache = Object.keys(cachedMap).map(key => ({
              id: key,
              name: String(cachedMap[key].customerName || cachedMap[key].name || key).toUpperCase(),
              phone: cachedMap[key].phone || '',
            }));
            listFromCache.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'accent' }));
            setCustomerOptions(listFromCache);
          }

          // Fetch từ Firestore CONGNO
          const querySnapshot = await getDocs(collection(db, "CONGNO"));
          const list = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const custName = data.customerName || data.name || docSnap.id;
            list.push({
              id: docSnap.id,
              name: String(custName).toUpperCase(),
              phone: data.phone || data.dienThoai || '',
            });
          });

          // Sắp xếp danh sách A-Z theo tiếng Việt
          list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'accent' }));
          setCustomerOptions(list);
        } catch (error) {
          console.error("Lỗi tải danh sách khách hàng CONGNO:", error);
        }
      };
      fetchCustomers();
    }
  }, [open]);

  // Xử lý check "Ngày hệ thống"
  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setIsSystemDate(checked);
    if (checked) {
      setNgayChuyenNo(getTodayFormatted());
    }
  };

  // Định dạng số tiền nhập vào (có dấu phân cách hàng nghìn)
  const formatMoneyInput = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('vi-VN');
  };

  const handleMoneyChange = (e) => {
    const formatted = formatMoneyInput(e.target.value);
    setTongTienNoCu(formatted);
  };

  // Nút Xóa (Làm mới form)
  const handleClear = () => {
    setNgayChuyenNo(getTodayFormatted());
    setIsSystemDate(true);
    setSelectedCustomer(null);
    setCustomerInputValue('');
    setTongTienNoCu('');
    setGhiChu('');
  };

  // 2. Nút Cập nhật (Lưu vào CONGNO theo cấu trúc transactions chuẩn)
  const handleSubmit = async () => {
    const rawCustomer = selectedCustomer 
      ? (typeof selectedCustomer === 'string' ? selectedCustomer : selectedCustomer.name)
      : customerInputValue;

    const customerName = String(rawCustomer || '').trim().toUpperCase();

    if (!customerName) {
      setSnackbar({ open: true, message: "Vui lòng chọn hoặc nhập tên khách hàng!", severity: "warning" });
      return;
    }

    const rawMoney = Number(String(tongTienNoCu).replace(/[^0-9]/g, '')) || 0;
    if (rawMoney <= 0) {
      setSnackbar({ open: true, message: "Vui lòng nhập tổng số tiền nợ cũ hợp lệ!", severity: "warning" });
      return;
    }

    const timestamp = Date.now();
    const safeId = formatCustomerId(customerName);
    const transDocId = `trans_${timestamp}_0`;
    const finalNote = ghiChu.trim() || '—';

    // Tạo object dòng giao dịch NỢ CŨ chuẩn
    const newTransaction = {
      id: transDocId,
      firebaseId: transDocId,
      customer: customerName,
      date: ngayChuyenNo,
      timestamp: timestamp,
      itemName: "NỢ CŨ",
      unit: "—",
      qty: "—",
      price: 0,
      amount: rawMoney,
      paid: 0,
      debt: rawMoney,
      note: finalNote
    };

    try {
      setLoading(true);

      const customerRef = doc(db, "CONGNO", safeId);
      const docSnap = await getDoc(customerRef);

      let existingTransactions = [];
      let oldTotalAmount = 0;
      let oldTotalPaid = 0;
      let oldCurrentDebt = 0;

      if (docSnap.exists()) {
        const data = docSnap.data();
        oldTotalAmount = Number(data.totalAmount) || 0;
        oldTotalPaid = Number(data.totalPaid) || 0;
        oldCurrentDebt = Number(data.currentDebt) || 0;
        
        const rawList = data.transactions || data.items || [];
        existingTransactions = Array.isArray(rawList) ? rawList : [];
      }

      // Đưa dòng NỢ CŨ lên đầu danh sách giao dịch
      const updatedTransactions = [newTransaction, ...existingTransactions];

      const newTotalAmount = oldTotalAmount + rawMoney;
      const newTotalPaid = oldTotalPaid;
      const newCurrentDebt = oldCurrentDebt + rawMoney;

      // Update hoặc Set mới Document CONGNO
      const payload = {
        docId: safeId,
        customerName: customerName,
        transactions: updatedTransactions,
        totalAmount: newTotalAmount,
        totalPaid: newTotalPaid,
        currentDebt: newCurrentDebt,
        lastUpdated: timestamp,
        lastDate: ngayChuyenNo
      };

      if (docSnap.exists()) {
        await updateDoc(customerRef, payload);
      } else {
        await setDoc(customerRef, payload);
      }

      // 3. CẬP NHẬT LOCALSTORAGE CACHE TỨC THÌ
      // A. Cache mảng cá nhân của khách hàng
      const transCacheKey = `thuanphat_debt_items_${safeId}_v1`;
      localStorage.setItem(transCacheKey, JSON.stringify(updatedTransactions));

      // B. Cache Map tổng quan các khách hàng
      const mapCacheKey = "thuanphat_debt_customers_map_v1";
      const cachedMapStr = localStorage.getItem(mapCacheKey);
      let cachedMap = cachedMapStr ? JSON.parse(cachedMapStr) : {};
      cachedMap[safeId] = {
        ...(cachedMap[safeId] || {}),
        docId: safeId,
        customerName: customerName,
        totalAmount: newTotalAmount,
        totalPaid: newTotalPaid,
        currentDebt: newCurrentDebt,
        lastUpdated: timestamp,
        lastDate: ngayChuyenNo
      };
      localStorage.setItem(mapCacheKey, JSON.stringify(cachedMap));

      // C. Cache danh sách tổng hợp (ALL)
      const allCacheKeys = ["thuanphat_debt_items_ALL_v1", "thuanphat_debt_items_v1"];
      allCacheKeys.forEach(cacheKey => {
        const cachedAllStr = localStorage.getItem(cacheKey);
        if (cachedAllStr) {
          try {
            let allItems = JSON.parse(cachedAllStr);
            if (Array.isArray(allItems)) {
              allItems = [newTransaction, ...allItems];
              localStorage.setItem(cacheKey, JSON.stringify(allItems));
            }
          } catch (e) {
            console.warn(`Lỗi chèn cache ALL cho NỢ CŨ:`, e);
          }
        }
      });

      // Hiển thị thông báo thành công
      const formattedMoneyStr = rawMoney.toLocaleString('vi-VN');
      setSnackbar({
        open: true,
        message: `Cập nhật nợ cũ thành công: ${formattedMoneyStr} VNĐ cho ${customerName}`,
        severity: "success",
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        handleClear();
        if (onClose) onClose();
      }, 1000);

    } catch (error) {
      console.error("Lỗi lưu nợ cũ vào CONGNO:", error);
      setSnackbar({ open: true, message: `Lỗi khi lưu: ${error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          onClose();
        }}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "18px",
            overflow: "hidden",
            background: "#f8fafc",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          },
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 3,
            py: 2,
            color: "#fff",
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            position: "relative",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Cập nhật nợ cũ khách hàng
            </Typography>
          </Stack>

          {/* CLOSE */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 10,
              top: 10,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.25)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* CONTENT */}
        <DialogContent sx={{ px: 4, py: 3.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Dòng 1: Ngày chuyển nợ */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Ngày chuyển nợ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                <TextField
                  size="small"
                  value={ngayChuyenNo}
                  disabled={isSystemDate}
                  onChange={(e) => setNgayChuyenNo(e.target.value)}
                  sx={{
                    width: '140px',
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.9rem' }
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSystemDate}
                      onChange={handleCheckboxChange}
                      size="small"
                      sx={{ color: '#1976d2', '&.Mui-checked': { color: '#1976d2' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Ngày hệ thống</Typography>}
                />
              </Box>
            </Box>

            {/* Dòng 2: Tên khách hàng */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Tên khách hàng
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={customerOptions}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                  value={selectedCustomer}
                  onChange={(event, newValue) => {
                    setSelectedCustomer(newValue);
                    if (typeof newValue === 'string') {
                      setCustomerInputValue(newValue);
                    } else if (newValue && newValue.name) {
                      setCustomerInputValue(newValue.name);
                    }
                  }}
                  inputValue={customerInputValue}
                  onInputChange={(event, newInputValue) => setCustomerInputValue(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Chọn hoặc nhập tên khách hàng..."
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                        '& input': { fontSize: '0.9rem' }
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Dòng 3: Tổng số tiền NỢ CŨ */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Tổng số tiền NỢ CŨ
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập số tiền..."
                  value={tongTienNoCu}
                  onChange={handleMoneyChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
                  }}
                />
              </Box>
            </Box>

            {/* Dòng 4: Ghi chú */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Ghi chú
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập ghi chú (nếu có)..."
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.9rem' }
                  }}
                />
              </Box>
            </Box>

            {/* ACTIONS */}
            <Box sx={{ pl: '160px', mt: 2.5 }}>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  sx={{
                    minWidth: 110,
                    height: 42,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                  }}
                >
                  Xóa
                </Button>

                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{
                    minWidth: 130,
                    height: 42,
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #1976d2, #42a5f5)",
                    boxShadow: "0 10px 20px rgba(25,118,210,0.25)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1565c0, #1976d2)",
                    },
                  }}
                >
                  {loading ? "Đang xử lý..." : "Cập nhật"}
                </Button>
              </Stack>
            </Box>

          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar thông báo trạng thái */}
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
    </>
  );
}