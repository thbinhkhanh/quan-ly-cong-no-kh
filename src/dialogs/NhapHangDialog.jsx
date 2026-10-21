import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  IconButton
} from '@mui/material';
import { X } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

/**
 * Hàm tạo Document ID an toàn không dấu từ tên hàng
 */
const formatCustomerId = (name) => {
  if (!name) return "SAN_PHAM_MOI";
  return String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
};

export default function NhapHangDialog({ open, onClose, onSuccess }) {
  const [useSystemDate, setUseSystemDate] = useState(true);
  const now = new Date();
  const systemDateStr = now.toLocaleDateString('vi-VN');

  const [customDate, setCustomDate] = useState(systemDateStr);
  const [khoItems, setKhoItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Tạo 10 dòng trống mặc định
  const createEmptyRows = () => Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: '',
    company: '',
    unit: 'Bao',
    price: 0,
    qty: '',
    km: '',
    discount: '',
    amount: 0
  }));

  const [rows, setRows] = useState(createEmptyRows());

  // Tải danh mục sản phẩm từ Firestore để gợi ý chọn Autocomplete
  useEffect(() => {
    if (open) {
      const fetchCatalog = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "DANHMUC"));
          const loadedData = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedData.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              company: data.company || '',
              unit: data.unit || 'Bao',
              price: Number(data.price) || 0,
            });
          });
          setKhoItems(loadedData);
        } catch (error) {
          console.error("Lỗi lấy danh mục mặt hàng:", error);
        }
      };
      fetchCatalog();
    }
  }, [open]);

  // Chọn sản phẩm gợi ý
  const handleSelectProduct = (index, selectedName) => {
    const updatedRows = [...rows];
    updatedRows[index].name = selectedName || '';

    const matched = khoItems.find(
      (p) => (p.name || '').toLowerCase() === (selectedName || '').toLowerCase()
    );

    if (matched) {
      updatedRows[index].company = matched.company || '';
      updatedRows[index].unit = matched.unit || 'Bao';
      updatedRows[index].price = Number(matched.price) || 0;
    }

    recalculateRow(updatedRows, index);
  };

  // Cập nhật từng ô trong dòng
  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    if (field === 'price' || field === 'discount') {
      const rawNum = String(value).replace(/[^0-9]/g, '');
      updatedRows[index][field] = Number(rawNum) || 0;
    } else {
      updatedRows[index][field] = value;
    }

    recalculateRow(updatedRows, index);
  };

  // Tính lại thành tiền của dòng
  const recalculateRow = (updatedRows, index) => {
    const price = Number(updatedRows[index].price) || 0;
    const qty = Number(updatedRows[index].qty) || 0;
    const discount = Number(updatedRows[index].discount) || 0;

    updatedRows[index].amount = Math.max(0, price * qty - discount);
    setRows(updatedRows);
  };

  const formatMoney = (val) => {
    if (!val && val !== 0) return '';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('vi-VN');
  };

  // Tổng cộng thành tiền
  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [rows]);

  // Làm mới hóa đơn
  const handleNewInvoice = () => {
    setRows(createEmptyRows());
  };

  // Lưu hóa đơn vào Firestore
  // Lưu hóa đơn vào Firestore
const handleSaveInvoice = async () => {
  const validRows = rows.filter(
    (r) => r && typeof r.name === 'string' && r.name.trim() !== ''
  );

  if (validRows.length === 0) {
    alert("Vui lòng nhập ít nhất một mặt hàng!");
    return;
  }

  try {
    setSaving(true);
    const danhMucRef = collection(db, "DANHMUC");

    for (const item of validRows) {
      const itemName = String(item.name).trim();
      if (!itemName) continue;

      const docId = formatCustomerId(itemName);
      const productDocRef = doc(danhMucRef, docId);

      await setDoc(
        productDocRef,
        {
          productId: docId,
          name: itemName,
          company: item.company ? String(item.company).trim() : '',
          unit: item.unit ? String(item.unit).trim() : 'Bao',
          price: Number(item.price) || 0,
          qtyImport: Number(item.qty) || 0,
          km: Number(item.km) || 0,
          discount: Number(item.discount) || 0,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    alert(`Đã lưu thành công ${validRows.length} mặt hàng nhập kho!`);
    
    // 🌟 TRUYỀN DỮ LIỆU ĐÃ LƯU VÀO ONSUCCESS
    if (onSuccess) {
      onSuccess(validRows); 
    }
    onClose();
  } catch (error) {
    console.error("Lỗi khi lưu hóa đơn nhập hàng:", error);
    alert("Lỗi khi ghi dữ liệu lên Firestore: " + error.message);
  } finally {
    setSaving(false);
  }
};

  // Style ô tiêu đề
  const headerSx = {
    bgcolor: "#00008b",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "0.85rem",
    textAlign: "center",
    verticalAlign: "middle",
    px: 1,
    py: 1,
    border: "1px solid #1e3a8a",
  };

  // Style ô dữ liệu
  const cellSx = {
    px: 0.5,
    py: 0.3,
    fontSize: "0.85rem",
    verticalAlign: "middle",
    border: "1px solid #cbd5e1",
  };

  const gridInputSx = (align = 'left') => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '2px',
      bgcolor: '#fff',
      height: '30px',
      fontSize: '0.85rem',
      '& fieldset': { borderColor: 'transparent' },
      '&:hover fieldset': { borderColor: '#94a3b8' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '1px' },
      '& input': { textAlign: align, padding: '2px 6px' }
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth paperProps={{ style: { borderRadius: 12 } }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#fff' }}>
        {/* TIÊU ĐỀ HÓA ĐƠN NHẬP HÀNG */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#ff0000', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            HÓA ĐƠN NHẬP HÀNG
          </Typography>

          {/* NGÀY LẬP PHIẾU */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography sx={{ fontWeight: 600, color: '#0000ff', fontSize: '0.9rem' }}>Ngày lập phiếu</Typography>
            <TextField
              size="small"
              value={useSystemDate ? systemDateStr : customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={useSystemDate}
              sx={{
                width: 120,
                '& .MuiOutlinedInput-root': { height: 28, borderRadius: 0 },
                '& input': { padding: '2px 6px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }
              }}
            />
            <FormControlLabel
              control={
                <Checkbox size="small" checked={useSystemDate} onChange={(e) => setUseSystemDate(e.target.checked)} />
              }
              label={<Typography sx={{ fontSize: '0.85rem', color: '#0000ff', fontWeight: 600 }}>Ngày hệ thống</Typography>}
              sx={{ mr: 0, ml: 0.5 }}
            />
          </Box>
        </Box>

        {/* BẢNG SẢN PHẨM NHẬP HÀNG */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, border: '1px solid #7dd3fc', mb: 3 }}>
          <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '75px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '130px' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {["STT", "TÊN HÀNG", "CÔNG TY", "ĐVT", "ĐƠN GIÁ", "SỐ LƯỢNG", "KHUYẾN MÃI", "CHIẾT KHẤU", "THÀNH TIỀN"].map((label) => (
                  <TableCell key={label} sx={headerSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => {
                const hasItem = Boolean(row.name && row.name.trim());

                return (
                  <TableRow key={row.id}>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 600, color: '#334155', bgcolor: '#f8fafc' }}>
                      {row.id}
                    </TableCell>

                    {/* TÊN HÀNG */}
                    <TableCell sx={cellSx}>
                      <Autocomplete
                        freeSolo
                        options={khoItems.map((p) => p.name).filter(Boolean)}
                        value={row.name}
                        onChange={(e, newValue) => handleSelectProduct(index, newValue)}
                        onInputChange={(e, newInputValue) => handleRowChange(index, 'name', newInputValue)}
                        renderInput={(params) => (
                          <TextField {...params} size="small" fullWidth sx={gridInputSx('left')} />
                        )}
                      />
                    </TableCell>

                    {/* CÔNG TY */}
                    <TableCell sx={cellSx}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.company}
                        onChange={(e) => handleRowChange(index, 'company', e.target.value)}
                        sx={gridInputSx('left')}
                      />
                    </TableCell>

                    {/* CỘT ĐVT - ẨN NẾU CHƯA NHẬP TÊN HÀNG */}
                    <TableCell sx={cellSx}>
                      {hasItem ? (
                        <TextField
                          size="small"
                          fullWidth
                          value={row.unit}
                          onChange={(e) => handleRowChange(index, 'unit', e.target.value)}
                          sx={gridInputSx('center')}
                        />
                      ) : null}
                    </TableCell>

                    {/* ĐƠN GIÁ */}
                    <TableCell sx={cellSx}>
                      <TextField
                        size="small"
                        fullWidth
                        value={formatMoney(row.price)}
                        onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                        sx={{ ...gridInputSx('right'), '& input': { fontWeight: 600 } }}
                      />
                    </TableCell>

                    {/* SỐ LƯỢNG */}
                    <TableCell sx={cellSx}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.qty}
                        onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                        sx={{ ...gridInputSx('right'), '& input': { fontWeight: 700 } }}
                      />
                    </TableCell>

                    {/* KHUYẾN MÃI */}
                    <TableCell sx={cellSx}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.km}
                        onChange={(e) => handleRowChange(index, 'km', e.target.value)}
                        sx={gridInputSx('right')}
                      />
                    </TableCell>

                    {/* CHIẾT KHẤU */}
                    <TableCell sx={cellSx}>
                      <TextField
                        size="small"
                        fullWidth
                        value={formatMoney(row.discount)}
                        onChange={(e) => handleRowChange(index, 'discount', e.target.value)}
                        sx={gridInputSx('right')}
                      />
                    </TableCell>

                    {/* THÀNH TIỀN */}
                    <TableCell align="right" sx={{ ...cellSx, textAlign: 'right', fontWeight: 700, color: '#1e3a8a', px: 1 }}>
                      {formatMoney(row.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* DÒNG TỔNG CỘNG */}
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ border: '1px solid #cbd5e1', py: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: '#0000ff', fontSize: '0.95rem' }}>
                    TỔNG CỘNG
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: '1px solid #cbd5e1', px: 1, fontWeight: 900, color: '#1e3a8a', fontSize: '0.95rem' }}>
                  {formatMoney(totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* NÚT THAO TÁC BO TRÒN THEO MẪU */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, pt: 1 }}>
          <Button
            variant="contained"
            onClick={handleSaveInvoice}
            disabled={saving}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              borderRadius: '20px',
              px: 4,
              py: 0.8,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {saving ? "Đang lưu..." : "Lưu hóa đơn"}
          </Button>

          <Button
            variant="contained"
            onClick={handleNewInvoice}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              borderRadius: '20px',
              px: 4,
              py: 0.8,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            Hóa đơn mới
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}