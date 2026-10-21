import React, { useState, useMemo } from 'react';
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
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Autocomplete,
  Grid,
  CircularProgress
} from "@mui/material";
import {
  Save,
  Printer,
  FilePlus,
  DollarSign,
  Clock,
  RotateCcw,
  Phone,
  MapPin
} from 'lucide-react';

import { useCongNo } from '../contexts/CongNoContext';
import { useKho } from '../contexts/KhoContext';
import { luuHoaDon } from '../utils/luuHoaDon'; // Sử dụng hàm luuHoaDon mới

// Import 3 Dialog đã tạo
import NoCu from '../dialogs/NoCu';
import ThanhToan from '../dialogs/ThanhToan';
import TraHang from '../dialogs/TraHang';

export default function HoaDonBanHang() {
  const { 
    customersMap, 
    items, 
    selectedCustomer, 
    setSelectedCustomer,
    addCustomer,
    addTransactionItem
  } = useCongNo();

  const khoContext = (() => {
    try { return useKho(); } catch { return null; }
  })();
  const khoItems = khoContext?.items || [];

  const [useSystemDate, setUseSystemDate] = useState(true);
  const systemDateStr = new Date().toLocaleDateString('vi-VN');
  const [customDate, setCustomDate] = useState(systemDateStr);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // STATE CHỐNG BẤM LƯU NHIỀU LẦN
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Quản lý trạng thái mở/đóng của 3 Dialog
  const [openNoCuDialog, setOpenNoCuDialog] = useState(false);
  const [openThanhToanDialog, setOpenThanhToanDialog] = useState(false);
  const [openTraHangDialog, setOpenTraHangDialog] = useState(false);

  // 🌟 LẤY VÀ SẮP XẾP DANH SÁCH KHÁCH HÀNG TỪ CACHE THEO THỨ TỰ ALPHABET (A-Z)
  const customerOptions = useMemo(() => {
    const fallbackSet = new Set();
    
    // 1. Lấy từ customersMap trong Context / LocalStorage Cache
    if (customersMap && typeof customersMap === 'object') {
      Object.keys(customersMap).forEach(key => {
        if (key && key.trim()) fallbackSet.add(key.trim().toUpperCase());
      });
    }

    // 2. Lấy từ danh sách items trong Context / Cache
    (items || []).forEach(item => {
      const custName = item.customer || item.customerName || item.khachHang;
      if (custName && String(custName).trim()) {
        fallbackSet.add(String(custName).trim().toUpperCase());
      }
    });

    // Chuyển thành Array và sắp xếp theo thứ tự bảng chữ cái tiếng Việt
    return Array.from(fallbackSet).sort((a, b) => 
      a.localeCompare(b, 'vi', { sensitivity: 'accent' })
    );
  }, [customersMap, items]);

  const [rows, setRows] = useState(
    Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      itemName: '',
      unit: 'Bao',
      price: 0,
      qty: '',
      amount: 0,
      note: ''
    }))
  );

  const [payment, setPayment] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSelectProduct = (index, selectedName) => {
    const updatedRows = [...rows];
    updatedRows[index].itemName = selectedName || '';

    const matchedProduct = khoItems.find(
      (p) => (p.name || '').toLowerCase() === (selectedName || '').toLowerCase()
    );

    if (matchedProduct) {
      updatedRows[index].unit = matchedProduct.unit || 'Bao';
      updatedRows[index].price = Number(matchedProduct.price) || 0;

      const qty = Number(updatedRows[index].qty) || 0;
      updatedRows[index].amount = (Number(matchedProduct.price) || 0) * qty;
    }

    setRows(updatedRows);
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];

    if (field === 'price') {
      const rawNum = String(value).replace(/[^0-9]/g, '');
      const priceNum = Number(rawNum) || 0;
      updatedRows[index].price = priceNum;
    } else {
      updatedRows[index][field] = value;
    }

    const price = Number(updatedRows[index].price) || 0;
    const qty = Number(updatedRows[index].qty) || 0;

    updatedRows[index].amount = price * qty;

    setRows(updatedRows);
  };

  const formatMoney = (val) => {
    if (!val && val !== 0) return '';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('vi-VN');
  };

  const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const numPayment = Number(String(payment).replace(/[^0-9]/g, '')) || 0;
  const remainingDebt = totalAmount - numPayment;

  // 🌟 HÀM LƯU HÓA ĐƠN DÙNG LUUL-HOA-DON MỚI VỚI CƠ CHẾ OPTIMISTIC UI
  const handleSaveInvoice = async () => {
    if (isSaving || isSaved) return;

    if (!selectedCustomer || !selectedCustomer.trim()) {
      setSnackbar({ open: true, message: "Vui lòng nhập hoặc chọn tên khách hàng!", severity: "warning" });
      return;
    }

    const nameUpper = selectedCustomer.trim().toUpperCase();
    const activeDate = useSystemDate ? systemDateStr : customDate;
    
    try {
      setIsSaving(true);

      // Gọi hàm luuHoaDon mới (cập nhật cache/UI ngay lập tức, Firestore chạy ngầm)
      const res = luuHoaDon({
        customerName: nameUpper,
        customerAddress,
        customerPhone,
        date: activeDate,
        items: rows,
        totalAmount,
        paidAmount: numPayment,
        remainingDebt,
      }, customersMap);

      // Cập nhật Context ngay lập tức để đồng bộ toàn ứng dụng
      if (addCustomer) {
        addCustomer(res.updatedCustomer.customerName, res.updatedCustomer);
      }
      if (addTransactionItem && res.newTransactions) {
        res.newTransactions.forEach(trans => addTransactionItem(trans));
      }

      // Đánh dấu đã lưu và báo thành công NGAY LẬP TỨC
      setIsSaved(true);
      setSnackbar({ open: true, message: res.message || "Lưu phiếu thành công!", severity: "success" });

    } catch (error) {
      console.error("Lỗi khi lưu hóa đơn:", error);
      setSnackbar({ open: true, message: error.message || "Lưu hóa đơn thất bại!", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewInvoice = () => {
    setSelectedCustomer('');
    setPayment('');
    setCustomerPhone('');
    setCustomerAddress('');

    setRows(
      Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        itemName: '',
        unit: 'Bao',
        price: 0,
        qty: '',
        amount: 0,
        note: '',
      }))
    );

    setIsSaved(false);
    setIsSaving(false);

    setUseSystemDate(true);
    setCustomDate(new Date().toLocaleDateString('vi-VN'));
  };

  const headerSx = {
    bgcolor: "#1e3a8a",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "0.85rem",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    px: 1,
    py: 1,
    border: "1px solid #1e3a8a",
  };

  const cellSx = {
    px: 0.5,
    py: 0.5,
    fontSize: "0.85rem",
    verticalAlign: "middle",
    border: "1px solid #cbd5e1",
  };

  const gridInputSx = (align = 'left') => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '4px',
      bgcolor: '#fff',
      height: '32px',
      fontSize: '0.85rem',
      '& fieldset': { borderColor: '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#94a3b8' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '1px' },
      '& input': { textAlign: align, padding: '4px 8px' }
    }
  });

  return (
    <Box sx={{ width: '80%', mx: 'auto', p: { xs: 1, sm: 2 }, bgcolor: '#f1f5f9', minHeight: '100vh', boxSizing: 'border-box' }}>
      <Paper elevation={2} sx={{ width: '100%', p: { xs: 2, sm: 3 }, borderRadius: 2, bgcolor: '#fff' }}>
        
        {/* ĐẦU PHIẾU: CHIA 3 CỘT */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr 1fr',
            },
            alignItems: 'start',
            width: '100%',
            columnGap: 1,
            rowGap: 2,
            mb: 2,
          }}
        >
          {/* CỘT 1: THÔNG TIN CỬA HÀNG - CĂN TRÁI */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '1' },
              gridRow: { xs: '2', md: '1' },
              justifySelf: 'start',
              textAlign: 'left',
              minWidth: 0,
              pt: 0,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                color: '#1e3a8a',
                textTransform: 'uppercase',
                fontSize: '1rem',
                lineHeight: 1.4,
              }}
            >
              CỬA HÀNG THUẬN PHÁT
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.3,
                color: '#475569',
                fontSize: '0.8rem',
              }}
            >
              <MapPin size={13} />
              <Typography component="span" sx={{ fontSize: 'inherit' }}>
                Bình Khánh, Cần Giờ, TP. HCM
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.2,
                color: '#475569',
                fontSize: '0.8rem',
              }}
            >
              <Phone size={13} />
              <Typography component="span" sx={{ fontSize: 'inherit' }}>
                SĐT: 0938.702.119
              </Typography>
            </Box>
          </Box>

          {/* CỘT 2: TIÊU ĐỀ + NGÀY LẬP - CĂN GIỮA */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '2' },
              gridRow: { xs: '1', md: '1' },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              textAlign: 'center',
              minWidth: 0,
              pt: 0,
              gap: 0.5,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: '#dc2626',
                letterSpacing: { xs: 0.5, sm: 1.5 },
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                fontSize: { xs: '1.15rem', sm: '1.5rem' },
                lineHeight: 1.4,
              }}
            >
              PHIẾU XUẤT KHO
            </Typography>

            {/* NGÀY LẬP */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.3,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  color: '#334155',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Ngày lập:
              </Typography>

              <TextField
                size="small"
                value={useSystemDate ? systemDateStr : customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                disabled={useSystemDate}
                sx={{
                  width: 110,
                  '& input': {
                    padding: '4px 6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                  },
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={useSystemDate}
                    onChange={(e) => setUseSystemDate(e.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Tự động
                  </Typography>
                }
                sx={{
                  mr: 0,
                  ml: 0,
                  whiteSpace: 'nowrap',
                }}
              />
            </Box>
          </Box>

          {/* CỘT 3: NÚT IN PHIẾU - CĂN PHẢI */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '3' },
              gridRow: { xs: '3', md: '1' },
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              alignItems: 'flex-start',
              gap: 1,
              minWidth: 0,
              pt: 0,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.print()}
              startIcon={<Printer size={16} />}
              sx={{
                borderColor: '#64748b',
                color: '#475569',
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              In phiếu
            </Button>
          </Box>
        </Box>
        
        <Box
          sx={{
            bgcolor: '#f8fafc',
            p: 1,
            borderRadius: 1.5,
            border: '1px solid #e2e8f0',
            mb: 1.5,
          }}
        >
          <Grid container spacing={1} alignItems="center">
            {/* 1. TÊN KHÁCH HÀNG */}
            <Grid item xs={12} sm={6} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#1e3a8a',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Khách hàng:
                </Typography>

                <Autocomplete
                  freeSolo
                  autoSelect={false}
                  selectOnFocus={false}
                  clearOnBlur={false}
                  options={customerOptions}
                  value={selectedCustomer || ''}
                  inputValue={selectedCustomer || ''}
                  onChange={(event, newValue) => {
                    setSelectedCustomer(newValue || '');
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input' || reason === 'clear') {
                      setSelectedCustomer(newInputValue || '');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Chọn hoặc nhập tên khách hàng..."
                      fullWidth
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                        },
                        '& .MuiInputBase-input': {
                          py: 0,
                        },
                      }}
                    />
                  )}
                  sx={{
                    flex: 1,
                    width: '100%',
                    minWidth: '340px',
                  }}
                />
              </Box>
            </Grid>

            {/* 2. ĐỊA CHỈ KHÁCH HÀNG */}
            <Grid item xs={12} sm={4} md={4.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#1e3a8a',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Địa chỉ:
                </Typography>

                <TextField
                  size="small"
                  fullWidth
                  placeholder="Nhập địa chỉ khách hàng..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    flex: 1,
                    minWidth: '300px',
                    '& .MuiInputBase-root': {
                      height: 32,
                      fontSize: '0.8rem',
                    },
                    '& .MuiInputBase-input': {
                      py: 0,
                    },
                  }}
                />
              </Box>
            </Grid>

            {/* 3. ĐIỆN THOẠI */}
            <Grid item xs={12} sm={2} md={2.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#1e3a8a',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  SĐT:
                </Typography>

                <TextField
                  size="small"
                  fullWidth
                  placeholder="SĐT..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    flex: 1,
                    minWidth: '100px',
                    '& .MuiInputBase-root': {
                      height: 32,
                      fontSize: '0.8rem',
                    },
                    '& .MuiInputBase-input': {
                      py: 0,
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* BẢNG SẢN PHẨM */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 3, borderColor: '#94a3b8', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: 'auto' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {["STT", "TÊN HÀNG", "ĐVT", "ĐƠN GIÁ", "SỐ LƯỢNG", "THÀNH TIỀN", "GHI CHÚ"].map((label) => (
                  <TableCell key={label} sx={headerSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id} hover>
                  <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e3a8a', bgcolor: '#f8fafc' }}>
                    {row.id}
                  </TableCell>

                  {/* CỘT TÊN HÀNG */}
                  <TableCell sx={cellSx}>
                    <Autocomplete
                      freeSolo
                      options={khoItems.map((p) => p.name).filter(Boolean)}
                      value={row.itemName}
                      onChange={(e, newValue) => handleSelectProduct(index, newValue)}
                      onInputChange={(e, newInputValue) => handleRowChange(index, 'itemName', newInputValue)}
                      renderInput={(params) => (
                        <TextField {...params} size="small" fullWidth placeholder="Chọn hoặc nhập..." sx={gridInputSx('left')} />
                      )}
                    />
                  </TableCell>

                  {/* CỘT ĐVT */}
                  <TableCell sx={cellSx}>
                    {row.itemName?.trim() ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={row.unit}
                        onChange={(e) => handleRowChange(index, 'unit', e.target.value)}
                        sx={gridInputSx('center')}
                      />
                    ) : null}
                  </TableCell>

                  {/* CỘT ĐƠN GIÁ */}
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      fullWidth
                      value={formatMoney(row.price)}
                      onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                      sx={{ ...gridInputSx('right'), '& input': { fontWeight: 600, color: '#1e293b' } }}
                    />
                  </TableCell>

                  {/* CỘT SỐ LƯỢNG */}
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.qty || ''}
                      onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                      sx={{ ...gridInputSx('right'), '& input': { fontWeight: 700 } }}
                    />
                  </TableCell>

                  {/* CỘT THÀNH TIỀN */}
                  <TableCell align="right" sx={{ ...cellSx, textAlign: 'right', fontWeight: 700, color: '#1e3a8a', px: 1, whiteSpace: 'nowrap' }}>
                    {formatMoney(row.amount)}
                  </TableCell>

                  {/* CỘT GHI CHÚ */}
                  <TableCell sx={cellSx}>
                    <TextField
                      size="small"
                      fullWidth
                      value={row.note}
                      onChange={(e) => handleRowChange(index, 'note', e.target.value)}
                      sx={{ ...gridInputSx('left'), '& input': { fontStyle: 'italic' } }}
                    />
                  </TableCell>
                </TableRow>
              ))}

              {/* DÒNG TỔNG CỘNG & THANH TOÁN */}
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell colSpan={7} sx={{ p: 1, borderTop: '2px solid #94a3b8' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      px: 1,
                    }}
                  >
                    {/* 1. TỔNG TIỀN HÀNG */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                        TỔNG CỘNG:
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: '#1e3a8a', fontSize: '1rem' }}>
                        {formatMoney(totalAmount)} VNĐ
                      </Typography>
                    </Box>

                    {/* 2. ĐÃ THANH TOÁN */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                        ĐÃ THANH TOÁN:
                      </Typography>
                      <TextField
                        size="small"
                        value={formatMoney(numPayment)}
                        onChange={(e) => setPayment(e.target.value.replace(/[^0-9]/g, ''))}
                        sx={{
                          width: 130,
                          bgcolor: '#fff',
                          '& .MuiOutlinedInput-root': {
                            height: '30px',
                            fontWeight: 800,
                            color: '#16a34a',
                            '& input': { textAlign: 'right', padding: '2px 6px' }
                          }
                        }}
                      />
                      <Typography sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem' }}>
                        VNĐ
                      </Typography>
                    </Box>

                    {/* 3. SỐ TIỀN CÒN LẠI / CÔNG NỢ */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem' }}>
                        CÒN LẠI:
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: '#dc2626', fontSize: '1rem' }}>
                        {formatMoney(remainingDebt)} VNĐ
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* NÚT TÁC VỤ DƯỚI CÙNG */}        
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveInvoice}
            disabled={isSaving || isSaved}
            startIcon={
              isSaving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Save size={16} />
              )
            }
            sx={{
              bgcolor: '#2563eb',
              '&:hover': { bgcolor: '#1d4ed8' },
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {isSaving ? 'Đang lưu...' : isSaved ? 'Đã lưu' : 'Lưu phiếu'}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleNewInvoice}
            startIcon={<FilePlus size={16} />}
            sx={{
              bgcolor: '#0284c7',
              '&:hover': { bgcolor: '#0369a1' },
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Tạo mới
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => setOpenNoCuDialog(true)}
            startIcon={<Clock size={16} />}
            sx={{
              bgcolor: '#475569',
              '&:hover': { bgcolor: '#334155' },
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Nợ cũ
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => setOpenThanhToanDialog(true)}
            startIcon={<DollarSign size={16} />}
            sx={{
              bgcolor: '#16a34a',
              '&:hover': { bgcolor: '#15803d' },
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Thanh toán
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => setOpenTraHangDialog(true)}
            startIcon={<RotateCcw size={16} />}
            sx={{
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Trả hàng
          </Button>
        </Box>

      </Paper>

      {/* Render 3 Dialogs */}
      <NoCu open={openNoCuDialog} onClose={() => setOpenNoCuDialog(false)} />
      <ThanhToan open={openThanhToanDialog} onClose={() => setOpenThanhToanDialog(false)} />
      <TraHang open={openTraHangDialog} onClose={() => setOpenTraHangDialog(false)} />

      {/* THÔNG BÁO SNACKBAR */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}