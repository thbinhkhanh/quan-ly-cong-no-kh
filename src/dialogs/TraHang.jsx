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
 * Hàm tạo Document ID an toàn chuẩn tiền tố "KH_..."
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

export default function TraHang({ open, onClose, onSuccess }) {
  // Lấy định dạng ngày hiện tại DD/MM/YYYY
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [ngayTraHang, setNgayTraHang] = useState(getTodayFormatted());
  const [isSystemDate, setIsSystemDate] = useState(true);
  
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInputValue, setCustomerInputValue] = useState('');

  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productInputValue, setProductInputValue] = useState('');

  const [donGia, setDonGia] = useState('');
  const [soLuong, setSoLuong] = useState('');
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

  // Tải danh sách khách hàng từ CONGNO (và kết hợp Cache) cùng danh mục hàng hóa khi Dialog mở
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          // 1. Tải danh sách khách hàng từ cache map hoặc collection "CONGNO"
          const cachedMapStr = localStorage.getItem("thuanphat_debt_customers_map_v1");
          if (cachedMapStr) {
            const cachedMap = JSON.parse(cachedMapStr);
            const listFromCache = Object.keys(cachedMap).map(key => ({
              id: key,
              name: String(cachedMap[key].customerName || cachedMap[key].name || key).toUpperCase(),
            }));
            listFromCache.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'accent' }));
            setCustomerOptions(listFromCache);
          }

          const customerSnap = await getDocs(collection(db, "CONGNO"));
          const cList = [];
          customerSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const custName = data.customerName || data.name || docSnap.id;
            cList.push({
              id: docSnap.id,
              name: String(custName).toUpperCase(),
            });
          });
          cList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'accent' }));
          setCustomerOptions(cList);

          // 2. Tải danh mục hàng hóa từ collection "DANHMUC"
          const productSnap = await getDocs(collection(db, "DANHMUC"));
          const pList = [];
          productSnap.forEach((docSnap) => {
            const data = docSnap.data();
            pList.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              price: Number(data.price) || 0,
              unit: data.unit || 'Bao'
            });
          });
          setProductOptions(pList);
        } catch (error) {
          console.error("Lỗi tải dữ liệu cho form trả hàng:", error);
        }
      };
      fetchData();
    }
  }, [open]);

  // Xử lý khi chọn sản phẩm từ danh sách để tự động điền đơn giá
  const handleProductChange = (event, newValue) => {
    setSelectedProduct(newValue);
    if (newValue && typeof newValue === 'object' && newValue.price) {
      setDonGia(Number(newValue.price).toLocaleString('vi-VN'));
    }
  };

  // Xử lý check "Ngày hệ thống"
  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setIsSystemDate(checked);
    if (checked) {
      setNgayTraHang(getTodayFormatted());
    }
  };

  // Định dạng số tiền/số lượng nhập vào (có dấu phân cách hàng nghìn)
  const formatNumberInput = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('vi-VN');
  };

  const handleDonGiaChange = (e) => {
    setDonGia(formatNumberInput(e.target.value));
  };

  const handleSoLuongChange = (e) => {
    setSoLuong(formatNumberInput(e.target.value));
  };

  // Nút Xóa (Làm mới form)
  const handleClear = () => {
    setNgayTraHang(getTodayFormatted());
    setIsSystemDate(true);
    setSelectedCustomer(null);
    setCustomerInputValue('');
    setSelectedProduct(null);
    setProductInputValue('');
    setDonGia('');
    setSoLuong('');
  };

  // Nút Cập nhật (Lưu trực tiếp vào CONGNO theo cấu trúc transactions)
  const handleSubmit = async () => {
    const rawCustomer = selectedCustomer 
      ? (typeof selectedCustomer === 'string' ? selectedCustomer : selectedCustomer.name)
      : customerInputValue;

    const customerName = String(rawCustomer || '').trim().toUpperCase();

    if (!customerName) {
      setSnackbar({ open: true, message: "Vui lòng chọn hoặc nhập tên khách hàng!", severity: "warning" });
      return;
    }

    const productName = (selectedProduct ? selectedProduct.name : productInputValue).trim();
    if (!productName) {
      setSnackbar({ open: true, message: "Vui lòng chọn hoặc nhập tên hàng trả lại!", severity: "warning" });
      return;
    }

    const rawPrice = Number(String(donGia).replace(/[^0-9]/g, '')) || 0;
    const rawQtyInput = Number(String(soLuong).replace(/[^0-9]/g, '')) || 0;

    if (rawPrice <= 0) {
      setSnackbar({ open: true, message: "Vui lòng nhập đơn giá hợp lệ!", severity: "warning" });
      return;
    }

    if (rawQtyInput <= 0) {
      setSnackbar({ open: true, message: "Vui lòng nhập số lượng hợp lệ!", severity: "warning" });
      return;
    }

    // 🌟 CHUYỂN SỐ LƯỢNG VÀ THÀNH TIỀN SANG SỐ ÂM ĐỂ GIẢM TRỪ CÔNG NỢ
    const negativeQty = -Math.abs(rawQtyInput);
    const negativeAmount = negativeQty * rawPrice;
    const unit = selectedProduct?.unit || 'Bao';
    const timestamp = Date.now();
    const safeId = formatCustomerId(customerName);
    const transDocId = `trans_${timestamp}_0`;

    const newTransaction = {
      id: transDocId,
      firebaseId: transDocId,
      customer: customerName,
      date: ngayTraHang,
      timestamp: timestamp,
      itemName: productName,
      unit: unit,
      qty: negativeQty,
      price: rawPrice,
      amount: negativeAmount, // Thành tiền âm
      paid: 0,
      debt: negativeAmount,
      note: "TRẢ HÀNG VỀ"
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

      // Đưa giao dịch trả hàng lên đầu mảng transactions
      const updatedTransactions = [newTransaction, ...existingTransactions];

      const newTotalAmount = oldTotalAmount + negativeAmount; // Giảm tổng mua do trả hàng
      const newTotalPaid = oldTotalPaid;
      const newCurrentDebt = oldCurrentDebt + negativeAmount; // Giảm dư nợ hiện tại

      const payload = {
        docId: safeId,
        customerName: customerName,
        transactions: updatedTransactions,
        totalAmount: newTotalAmount,
        totalPaid: newTotalPaid,
        currentDebt: newCurrentDebt,
        lastUpdated: timestamp,
        lastDate: ngayTraHang
      };

      if (docSnap.exists()) {
        await updateDoc(customerRef, payload);
      } else {
        await setDoc(customerRef, payload);
      }

      // 🌟 CẬP NHẬT LOCALSTORAGE CACHE TỨC THÌ
      // A. Cache cá nhân
      const transCacheKey = `thuanphat_debt_items_${safeId}_v1`;
      localStorage.setItem(transCacheKey, JSON.stringify(updatedTransactions));

      // B. Cache Map tổng quan
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
        lastDate: ngayTraHang
      };
      localStorage.setItem(mapCacheKey, JSON.stringify(cachedMap));

      // C. Cache tổng hợp (ALL)
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
            console.warn(`Lỗi cập nhật cache ALL khi trả hàng:`, e);
          }
        }
      });

      setSnackbar({
        open: true,
        message: `Trả hàng thành công: ${productName} × ${rawQtyInput}`,
        severity: "success",
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        handleClear();
        if (onClose) onClose();
      }, 1000);

    } catch (error) {
      console.error("Lỗi lưu thông tin trả hàng vào CONGNO:", error);
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
              Cập nhật hàng trả lại
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
            
            {/* Dòng 1: Ngày trả hàng */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Ngày trả hàng
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                <TextField
                  size="small"
                  value={ngayTraHang}
                  disabled={isSystemDate}
                  onChange={(e) => setNgayTraHang(e.target.value)}
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

            {/* Dòng 3: Tên hàng trả lại */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Tên hàng trả lại
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={productOptions}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                  value={selectedProduct}
                  onChange={handleProductChange}
                  inputValue={productInputValue}
                  onInputChange={(event, newInputValue) => setProductInputValue(newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Chọn hoặc nhập tên hàng trả lại..."
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                        '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Dòng 4: Đơn giá */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Đơn giá
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập đơn giá..."
                  value={donGia}
                  onChange={handleDonGiaChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
                  }}
                />
              </Box>
            </Box>

            {/* Dòng 5: Số lượng */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Số lượng
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập số lượng..."
                  value={soLuong}
                  onChange={handleSoLuongChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
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