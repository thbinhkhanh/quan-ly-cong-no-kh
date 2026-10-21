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
  Snackbar,
  Alert,
  Stack,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Import Firebase, Firestore và Context
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useCongNo } from "../contexts/CongNoContext";

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

export default function ThanhToanCongNo({ open, onClose, onSuccess, customerName }) {
  const { customersMap, setItems, setCustomersMap } = useCongNo();

  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [ngayThanhToan, setNgayThanhToan] = useState(getTodayFormatted());
  const [isSystemDate, setIsSystemDate] = useState(true);
  const [soTienThanhToan, setSoTienThanhToan] = useState('');
  const [soTienGiam, setSoTienGiam] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Reset form khi Dialog mở
  useEffect(() => {
    if (open) {
      setNgayThanhToan(getTodayFormatted());
      setIsSystemDate(true);
      setSoTienThanhToan('');
      setSoTienGiam('');
      setGhiChu('');
    }
  }, [open]);

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setIsSystemDate(checked);
    if (checked) {
      setNgayThanhToan(getTodayFormatted());
    }
  };

  const formatMoneyInput = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('vi-VN');
  };

  const handleThanhToanChange = (e) => {
    setSoTienThanhToan(formatMoneyInput(e.target.value));
  };

  const handleGiamChange = (e) => {
    setSoTienGiam(formatMoneyInput(e.target.value));
  };

  const handleClear = () => {
    setNgayThanhToan(getTodayFormatted());
    setIsSystemDate(true);
    setSoTienThanhToan('');
    setSoTienGiam('');
    setGhiChu('');
  };

  // ⚡ CẬP NHẬT TỨC THÌ (OPTIMISTIC UPDATE) & ĐỒNG BỘ CONGNO FIRESTORE NỀN
  const handleSubmit = () => {
    const finalCustomerName = String(customerName || '').trim().toUpperCase();

    if (!finalCustomerName) {
      setSnackbar({ open: true, message: "Không tìm thấy tên khách hàng!", severity: "warning" });
      return;
    }

    const rawThanhToan = Number(String(soTienThanhToan).replace(/[^0-9]/g, '')) || 0;
    const rawGiam = Number(String(soTienGiam).replace(/[^0-9]/g, '')) || 0;

    if (rawThanhToan <= 0) {
      setSnackbar({ open: true, message: "Vui lòng nhập số tiền thanh toán hợp lệ!", severity: "warning" });
      return;
    }

    const timestamp = Date.now();
    const safeId = formatCustomerId(finalCustomerName);

    // Tạo mã giao dịch chuẩn
    const dateParts = String(ngayThanhToan || '').trim().split(/[/-]/);
    const now = new Date();
    let formattedDate;

    if (dateParts.length === 3) {
      const [dd, mm, yyyy] = dateParts;
      formattedDate = [
        dd.padStart(2, '0'),
        mm.padStart(2, '0'),
        yyyy,
      ].join('-');
    } else {
      formattedDate = [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0'),
        now.getFullYear(),
      ].join('-');
    }

    const transDocId = `trans_${timestamp}_0`;

    let finalNote = ghiChu.trim();
    if (rawGiam > 0) {
      const formattedGiam = rawGiam.toLocaleString('vi-VN');
      finalNote = finalNote ? `${finalNote} (Giảm: ${formattedGiam}đ)` : `Giảm giá: ${formattedGiam}đ`;
    }
    if (!finalNote) finalNote = '—';

    // 1. Tạo đối tượng giao dịch mới chuẩn structure `transactions`
    const newTransaction = {
      id: transDocId,
      firebaseId: transDocId,
      customer: finalCustomerName,
      date: ngayThanhToan,
      timestamp: timestamp,
      itemName: "TRẢ TIỀN",
      unit: "—",
      qty: "—",
      price: 0,
      amount: 0,
      paid: rawThanhToan,
      debt: -rawThanhToan,
      note: finalNote
    };

    // 2. Cập nhật State trực tiếp vào Context để UI phản hồi NGAY LẬP TỨC
    if (setItems) {
      setItems(prev => [newTransaction, ...prev]);
    }
    
    // Lấy số liệu khách hàng cũ từ Context để tính toán optimistic state
    const existingCust = customersMap[finalCustomerName] || {};
    const oldTotalAmount = Number(existingCust.amountNum || existingCust.totalAmount || 0);
    const oldTotalPaid = Number(existingCust.paidNum || existingCust.totalPaid || 0);
    const oldCurrentDebt = Number(existingCust.debtNum || existingCust.currentDebt || 0);

    const newTotalAmount = oldTotalAmount;
    const newTotalPaid = oldTotalPaid + rawThanhToan;
    const newCurrentDebt = oldCurrentDebt - rawThanhToan;

    if (setCustomersMap) {
      setCustomersMap(prev => ({
        ...prev,
        [finalCustomerName]: {
          ...(prev[finalCustomerName] || {}),
          docId: safeId,
          customerName: finalCustomerName,
          totalAmount: newTotalAmount,
          totalPaid: newTotalPaid,
          currentDebt: newCurrentDebt,
          amountNum: newTotalAmount,
          paidNum: newTotalPaid,
          debtNum: newCurrentDebt,
          lastUpdated: timestamp,
          lastDate: ngayThanhToan
        }
      }));
    }

    // 3. Thông báo thành công và đóng dialog ngay tức thì
    const formattedMoneyStr = rawThanhToan.toLocaleString('vi-VN');
    setSnackbar({
      open: true,
      message: `Thanh toán thành công: ${formattedMoneyStr} VNĐ`,
      severity: "success",
    });

    if (onSuccess) onSuccess();

    setTimeout(() => {
      handleClear();
      if (onClose) onClose();
    }, 400);

    // 4. Tiến trình ghi Firestore chạy ngầm (Background Sync theo CONGNO)
    const syncFirestoreInBackground = async () => {
      try {
        const customerRef = doc(db, "CONGNO", safeId);
        const docSnap = await getDoc(customerRef);

        let existingTransactions = [];
        let firestoreTotalAmount = oldTotalAmount;
        let firestoreTotalPaid = oldTotalPaid;

        if (docSnap.exists()) {
          const data = docSnap.data();
          firestoreTotalAmount = Number(data.totalAmount) || 0;
          firestoreTotalPaid = Number(data.totalPaid) || 0;
          
          const rawList = data.transactions || data.items || [];
          existingTransactions = Array.isArray(rawList) ? rawList : [];
        }

        const updatedTransactions = [newTransaction, ...existingTransactions];
        const finalTotalPaid = firestoreTotalPaid + rawThanhToan;
        const finalCurrentDebt = firestoreTotalAmount - finalTotalPaid;

        const payload = {
          docId: safeId,
          customerName: finalCustomerName,
          transactions: updatedTransactions,
          totalAmount: firestoreTotalAmount,
          totalPaid: finalTotalPaid,
          currentDebt: finalCurrentDebt,
          lastUpdated: timestamp,
          lastDate: ngayThanhToan
        };

        if (docSnap.exists()) {
          await updateDoc(customerRef, payload);
        } else {
          await setDoc(customerRef, payload);
        }

        // Cập nhật LocalStorage cache cụ thể của khách hàng
        const transCacheKey = `thuanphat_debt_items_${safeId}_v1`;
        localStorage.setItem(transCacheKey, JSON.stringify(updatedTransactions));

        // Cập nhật Cache tổng hợp ALL nếu có
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
              console.warn(`Lỗi cập nhật cache ALL khi thanh toán:`, e);
            }
          }
        });

      } catch (error) {
        console.error("Lỗi đồng bộ Firestore ngầm khi thanh toán:", error);
      }
    };

    syncFirestoreInBackground();
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
              Cập nhật thanh toán khách hàng
            </Typography>
          </Stack>

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
            
            {/* Dòng 1: Ngày thanh toán */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Ngày thanh toán
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                <TextField
                  size="small"
                  value={ngayThanhToan}
                  disabled={isSystemDate}
                  onChange={(e) => setNgayThanhToan(e.target.value)}
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

            {/* Dòng 2: Tên khách hàng (Ô HIỂN THỊ CỐ ĐỊNH - KHÔNG PHẢI INPUT, KHÔNG THỂ SỬA) */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 600, fontSize: '0.9rem', color: '#334155', flexShrink: 0 }}>
                Tên khách hàng
              </Typography>
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  px: 1.8, 
                  py: 1, 
                  bgcolor: '#f1f5f9', 
                  borderRadius: '10px', 
                  border: '1px solid #cbd5e1',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {customerName || '—'}
                </Typography>
              </Box>
            </Box>

            {/* Dòng 3: Số tiền thanh toán */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Số tiền thanh toán
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập số tiền thanh toán..."
                  value={soTienThanhToan}
                  onChange={handleThanhToanChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
                  }}
                />
              </Box>
            </Box>

            {/* Dòng 4: Số tiền giảm */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: '160px', fontWeight: 700, fontSize: '0.9rem', color: '#d32f2f', flexShrink: 0 }}>
                Số tiền giảm
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập số tiền giảm (nếu có)..."
                  value={soTienGiam}
                  onChange={handleGiamChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    '& input': { fontSize: '0.95rem', fontWeight: 700, color: '#d32f2f' }
                  }}
                />
              </Box>
            </Box>

            {/* Dòng 5: Ghi chú */}
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
                  Cập nhật
                </Button>
              </Stack>
            </Box>

          </Box>
        </DialogContent>
      </Dialog>

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