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
  Stack,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Import Firebase và Firestore
import { db } from "../firebase";
//import { doc, updateDoc } from "firebase/firestore";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Hàm tạo Document ID an toàn không dấu dùng cho debt_transactions
 */
/**
 * Hàm tạo Document ID an toàn có tiền tố KH_ chuẩn thống nhất
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

export default function SuaGiaoDichCongNo({ open, onClose, item, onSuccess }) {
  // Lấy định dạng ngày hiện tại DD/MM/YYYY
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [date, setDate] = useState(getTodayFormatted());
  const [isSystemDate, setIsSystemDate] = useState(true);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Bao');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');
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

  // Nạp dữ liệu cũ vào form khi mở Dialog
  useEffect(() => {
    if (item && open) {
      setDate(getTodayFormatted());
      setIsSystemDate(true);

      setItemName(item.itemName || '');
      setUnit(item.unit || 'Bao');
      setQty(item.qty !== undefined && item.qty !== null ? String(item.qty) : '');
      setPrice(item.price ? Number(item.price).toLocaleString('vi-VN') : '');
      
      const currentAmount = item.amountNum !== undefined ? item.amountNum : (item.amount || 0);
      setAmount(currentAmount ? Number(currentAmount).toLocaleString('vi-VN') : '');

      const currentPaid = item.paidNum !== undefined ? item.paidNum : (item.paid || 0);
      setPaid(currentPaid ? Number(currentPaid).toLocaleString('vi-VN') : '');
      
      setNote(item.note || '');
    }
  }, [item, open]);

  // Xử lý check "Ngày hệ thống"
  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setIsSystemDate(checked);
    if (checked) {
      setDate(getTodayFormatted());
    }
  };

  // Định dạng số tiền nhập vào
  const formatMoneyInput = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('vi-VN');
  };

  // Tự động tính Thành tiền khi Số lượng hoặc Đơn giá thay đổi
  const handleQtyOrPriceChange = (newQty, newPrice) => {
    const rawQ = Number(String(newQty).replace(/[^0-9\-]/g, '')) || 0;
    const rawP = Number(String(newPrice).replace(/[^0-9]/g, '')) || 0;
    const calcAmount = rawQ * rawP;
    setAmount(calcAmount ? calcAmount.toLocaleString('vi-VN') : '');
  };

  const handleQtyChange = (e) => {
    const val = e.target.value;
    setQty(val);
    handleQtyOrPriceChange(val, price);
  };

  const handlePriceChange = (e) => {
    const formatted = formatMoneyInput(e.target.value);
    setPrice(formatted);
    handleQtyOrPriceChange(qty, formatted);
  };

  const handleAmountChange = (e) => {
    setAmount(formatMoneyInput(e.target.value));
  };

  // Nút Xóa / Làm mới form về nguyên bản của giao dịch
  const handleReset = () => {
    if (item) {
      setDate(getTodayFormatted());
      setIsSystemDate(true);
      setItemName(item.itemName || '');
      setUnit(item.unit || 'Bao');
      setQty(item.qty !== undefined && item.qty !== null ? String(item.qty) : '');
      setPrice(item.price ? Number(item.price).toLocaleString('vi-VN') : '');
      const currentAmount = item.amountNum !== undefined ? item.amountNum : (item.amount || 0);
      setAmount(currentAmount ? Number(currentAmount).toLocaleString('vi-VN') : '');
      const currentPaid = item.paidNum !== undefined ? item.paidNum : (item.paid || 0);
      setPaid(currentPaid ? Number(currentPaid).toLocaleString('vi-VN') : '');
      setNote(item.note || '');
    }
  };

  // Nút Cập nhật giao dịch chuẩn theo cấu trúc mảng TRANSACTIONS
  const handleSubmit = async () => {
    if (!item) {
      setSnackbar({ open: true, message: "Không tìm thấy thông tin giao dịch!", severity: "error" });
      return;
    }

    // 1. CHUẨN HOÁ SỐ LIỆU TỪ FORM
    const rawPrice = Number(String(price).replace(/[^0-9]/g, '')) || 0;
    const rawPaid = Number(String(paid).replace(/[^0-9]/g, '')) || 0;
    const rawQtyNum = Number(String(qty).replace(/[^0-9\-]/g, '')) || 0;
    const rawAmount = Number(String(amount).replace(/[^0-9\-]/g, '')) || 0;

    const isNegativeQty = typeof item.qty === 'number' && item.qty < 0;
    const finalQty = isNegativeQty ? -Math.abs(rawQtyNum) : (unit === '—' || item.qty === '—' ? '—' : rawQtyNum);
    const finalAmount = rawAmount !== 0 ? (isNegativeQty ? -Math.abs(rawAmount) : rawAmount) : (typeof finalQty === 'number' ? finalQty * rawPrice : 0);
    const finalDebt = finalAmount - rawPaid;

    const customerName = String(item.customer || item.customerName || '').trim();
    let safeId = formatCustomerId(customerName);
    
    // Mã nhận diện duy nhất của dòng giao dịch (hỗ trợ cả id cũ trans_... và firebaseId mới)
    const targetDocId = item.id || item.firebaseId || item.docId;

    try {
      setLoading(true);

      let customerRef = doc(db, "CONGNO", safeId);
      let docSnap = await getDoc(customerRef);

      // Nếu tìm theo safeId không thấy, tìm kiếm fallback trong cache map
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
            customerRef = doc(db, "CONGNO", safeId);
            docSnap = await getDoc(customerRef);
          }
        }
      }

      if (!docSnap.exists()) {
        throw new Error(`Không tìm thấy thông tin khách hàng "${customerName}" trong CONGNO!`);
      }

      const data = docSnap.data();
      // Lấy mảng transactions (nếu không có thì lấy items làm fallback)
      const currentList = data.transactions || data.items || [];

      // 2. CẬP NHẬT DÒNG GIAO DỊCH TRONG MẢNG TRANSACTIONS
      const updatedList = currentList.map((t, idx) => {
        const transId = t.id || t.firebaseId || `${safeId}_${idx}`;
        if (transId === targetDocId) {
          return {
            ...t,
            date: date.trim(),
            itemName: itemName.trim(),
            unit: unit.trim(),
            qty: finalQty,
            price: rawPrice,
            amount: finalAmount,
            paid: rawPaid,
            debt: finalDebt,
            note: note.trim() || '—',
            lastUpdated: Date.now()
          };
        }
        return t;
      });

      // 3. TÍNH LẠI CÁC CHỈ SỐ TÀI CHÍNH LŨY KẾ
      const newTotalAmount = updatedList.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
      const newTotalPaid = updatedList.reduce((sum, row) => sum + (Number(row.paid) || 0), 0);
      const newCurrentDebt = newTotalAmount - newTotalPaid;

      // 4. GHI CẬP NHẬT TRỰC TIẾP LÊN FIRESTORE
      await updateDoc(customerRef, {
        transactions: updatedList,
        totalAmount: newTotalAmount,
        totalPaid: newTotalPaid,
        currentDebt: newCurrentDebt,
        lastUpdated: Date.now()
      });

      // 5. CẬP NHẬT LẠI CACHE LOCALSTORAGE ĐỒNG BỘ
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

      // 🌟 6. CẬP NHẬT TRỰC TIẾP ĐÚNG DÒNG ĐÃ SỬA TRONG CACHE TỔNG HỢP (ALL)
      const allCacheKeys = ["thuanphat_debt_items_ALL_v1", "thuanphat_debt_items_v1"];
      allCacheKeys.forEach(cacheKey => {
        const cachedAllStr = localStorage.getItem(cacheKey);
        if (cachedAllStr) {
          try {
            let allItems = JSON.parse(cachedAllStr);
            if (Array.isArray(allItems)) {
              allItems = allItems.map(t => {
                const tId = t.id || t.firebaseId;
                if (tId === targetDocId) {
                  return {
                    ...t,
                    date: date.trim(),
                    itemName: itemName.trim(),
                    unit: unit.trim(),
                    qty: finalQty,
                    price: rawPrice,
                    amount: finalAmount,
                    paid: rawPaid,
                    debt: finalDebt,
                    note: note.trim() || '—',
                    lastUpdated: Date.now()
                  };
                }
                return t;
              });
              localStorage.setItem(cacheKey, JSON.stringify(allItems));
            }
          } catch (e) {
            console.warn(`Lỗi cập nhật cache tổng hợp cho key ${cacheKey}:`, e);
          }
        }
      });

      setSnackbar({ open: true, message: "Cập nhật giao dịch thành công!", severity: "success" });
      
      if (onSuccess) onSuccess();

      setTimeout(() => {
        if (onClose) onClose();
      }, 700);

    } catch (error) {
      console.error("Lỗi khi cập nhật giao dịch:", error);
      setSnackbar({ open: true, message: `Lỗi khi lưu: ${error.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const labelWidth = '110px';

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          onClose();
        }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            overflow: "hidden",
            background: "#f8fafc",
            boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            color: "#fff",
            background: "linear-gradient(135deg, #1976d2, #42a5f5)",
            position: "relative",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>
              Chỉnh sửa giao dịch công nợ
            </Typography>
          </Stack>

          {/* CLOSE */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.15)",
              padding: '4px',
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.25)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>

        {/* CONTENT */}
        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            
            {/* Khách hàng */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                Khách hàng
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>
                {item?.customer || '—'}
              </Typography>
            </Box>

            {/* Ngày lập */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                Ngày lập
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                <TextField
                  size="small"
                  value={date}
                  disabled={isSystemDate}
                  onChange={(e) => setDate(e.target.value)}
                  sx={{
                    width: '120px',
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', py: 0 }
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSystemDate}
                      onChange={handleCheckboxChange}
                      size="small"
                      sx={{ color: '#1976d2', '&.Mui-checked': { color: '#1976d2' }, p: 0.5 }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Ngày hệ thống</Typography>}
                />
              </Box>
            </Box>

            {/* Tên hàng / Nội dung */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                Tên hàng
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', fontWeight: 700, py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* ĐVT & Số lượng */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                  Đơn vị tính
                </Typography>
                <TextField
                  size="small"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  sx={{
                    width: '100%',
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', py: 0 }
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Typography sx={{ width: '70px', fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0, pl: 1 }}>
                  Số lượng
                </Typography>
                <TextField
                  size="small"
                  value={qty}
                  onChange={handleQtyChange}
                  sx={{
                    width: '100%',
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', fontWeight: 700, textAlign: 'center', py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* Đơn giá */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                Đơn giá
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={price}
                  onChange={handlePriceChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* Thành tiền */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 700, fontSize: '0.82rem', color: '#1e3a8a', flexShrink: 0 }}>
                Thành tiền
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={amount}
                  onChange={handleAmountChange}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a', py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* Thanh toán */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 700, fontSize: '0.82rem', color: '#16a34a', flexShrink: 0 }}>
                Thanh toán
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={paid}
                  onChange={(e) => setPaid(formatMoneyInput(e.target.value))}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* Ghi chú */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ width: labelWidth, fontWeight: 600, fontSize: '0.82rem', color: '#334155', flexShrink: 0 }}>
                Ghi chú
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '32px' },
                    '& input': { fontSize: '0.82rem', py: 0 }
                  }}
                />
              </Box>
            </Box>

            {/* ACTIONS */}
            <Box sx={{ pl: labelWidth, mt: 1.5 }}>
              <Stack direction="row" spacing={1.5} justifyContent="flex-start">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleReset}
                  sx={{
                    minWidth: 90,
                    height: 34,
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                  }}
                >
                  Đặt lại
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSubmit}
                  disabled={loading}
                  sx={{
                    minWidth: 100,
                    height: 34,
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #1976d2, #42a5f5)",
                    boxShadow: "0 6px 15px rgba(25,118,210,0.2)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1565c0, #1976d2)",
                    },
                  }}
                >
                  {loading ? "Đang lưu..." : "Cập nhật"}
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
          sx={{ width: "100%", fontWeight: 600, fontSize: "0.82rem" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}