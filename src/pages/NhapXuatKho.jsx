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
  InputAdornment,
  Snackbar,
  Alert
} from "@mui/material";
import {
  Search,
  Printer,
  FileSpreadsheet,
  PackageCheck,
  PackageMinus
} from 'lucide-react';

// Import KhoContext chung
import { useKho } from '../contexts/KhoContext';

export default function NhapXuatKho() {
  const { items } = useKho();
  const [searchTerm, setSearchTerm] = useState('');

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

  // 🚀 TỐI ƯU 1: Dùng useMemo để cache kết quả tìm kiếm, tránh tính toán thừa khi re-render
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items || [];
    const term = searchTerm.toLowerCase();
    return (items || []).filter(item => 
      item && item.name && (
        item.name.toString().toLowerCase().includes(term) ||
        (item.company && item.company.toString().toLowerCase().includes(term))
      )
    );
  }, [items, searchTerm]);

  const formatMoney = (val) => {
    if (val === '-' || val === '' || val === null || val === undefined) return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('vi-VN');
  };

  const formatStock = (val) => {
    if (val === '-' || val === '' || val === null || val === undefined) return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    if (num < 0) {
      return `(${Math.abs(num).toLocaleString('vi-VN')})`;
    }
    return num.toLocaleString('vi-VN');
  };

  // 🚀 TỐI ƯU 2: Cache các giá trị tổng số lượng bằng useMemo
  const { totalImport, totalExport, totalStock } = useMemo(() => {
    let imp = 0, exp = 0, stk = 0;
    for (const item of filteredItems) {
      if (typeof item.qtyImport === 'number') imp += item.qtyImport;
      if (typeof item.qtyExport === 'number') exp += item.qtyExport;
      if (typeof item.qtyStock === 'number') stk += item.qtyStock;
    }
    return { totalImport: imp, totalExport: exp, totalStock: stk };
  }, [filteredItems]);

  const headerSx = {
    bgcolor: "#c7e8f8",
    color: "#0000ff",
    fontWeight: 800,
    fontSize: "0.82rem",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    px: 1.25,
    py: 1.25,
    border: "1px solid #7dd3fc",
  };

  const cellSx = {
    px: 1,
    py: 1,
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
        {/* THANH CHỨC NĂNG */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.print()}
            startIcon={<Printer size={16} />}
            sx={{
              borderColor: '#475569',
              color: '#475569',
              textTransform: 'none',
              borderRadius: 1.5,
              fontWeight: 600,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            In Bảng
          </Button>
        </Box>

        {/* TIÊU ĐỀ TRANG CĂN GIỮA TUYỆT ĐỐI */}
        <Box sx={{ width: '100%', textAlign: 'center', mb: 3, mt: -2 }}>
          <Typography 
            sx={{ 
              fontSize: "1.2rem", 
              fontWeight: 800, 
              color: "#1e3a8a", 
              textTransform: "uppercase",
              letterSpacing: 0.5
            }}
          >
            BẢNG NHẬP - XUẤT HÀNG
          </Typography>
        </Box>

        {/* THỐNG KÊ TỔNG QUAN */}
        <Box 
          sx={{ 
            maxWidth: 600, 
            mx: 'auto', 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
            gap: 1.5, 
            mb: 2.5 
          }}
        >
          <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Tổng SL Nhập
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb', mt: 0.25 }}>
                {totalImport.toLocaleString('vi-VN')}
              </Typography>
            </Box>
            <Box sx={{ p: 0.75, bgcolor: '#eff6ff', color: '#2563eb', borderRadius: 1 }}>
              <PackageCheck size={18} />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Tổng SL Xuất
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#d97706', mt: 0.25 }}>
                {totalExport.toLocaleString('vi-VN')}
              </Typography>
            </Box>
            <Box sx={{ p: 0.75, bgcolor: '#fffbe3', color: '#d97706', borderRadius: 1 }}>
              <PackageMinus size={18} />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 1.25, border: '1px solid #e2e8f0', borderRadius: 1.5, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Tổng Tồn Kho
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', mt: 0.25 }}>
                {totalStock.toLocaleString('vi-VN')}
              </Typography>
            </Box>
            <Box sx={{ p: 0.75, bgcolor: '#f0fdf4', color: '#16a34a', borderRadius: 1 }}>
              <PackageCheck size={18} />
            </Box>
          </Paper>
        </Box>

        {/* THANH TÌM KIẾM */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm theo tên hàng, công ty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 320,
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
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Hiển thị: <b>{filteredItems.length}</b> / <b>{(items || []).length}</b> dòng
          </Typography>
        </Box>

        {/* BẢNG DỮ LIỆU */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            width: '100%',
            overflowX: "auto",
            maxHeight: 650,
            mb: 0.5,
            "&::-webkit-scrollbar": { height: 8, width: 8 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 10 },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              minWidth: 1300,
              tableLayout: "fixed",
              "& .MuiTableCell-root": { borderColor: "#cbd5e1" },
            }}
          >
            <colgroup>
              {[50, 260, 160, 80, 110, 90, 80, 90, 90, 100, 100, 100].map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>

            <TableHead>
              <TableRow>
                {[
                  "STT",
                  "Tên hàng",
                  "Công ty",
                  "ĐVT",
                  "Đơn giá",
                  "SL Nhập",
                  "K.Mãi",
                  "SL Xuất",
                  "SL Tồn",
                  "Trọng lượng",
                  "Thức ăn",
                  "Thuốc",
                ].map((label) => (
                  <TableCell key={label} sx={headerSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <TableRow key={item.id || index} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 600, color: '#475569' }}>
                      {item.stt || index + 1}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, fontWeight: 700, color: '#0f172a' }}>
                      {item.name}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: '#334155', fontWeight: 600 }}>
                      {item.company || '—'}
                    </TableCell>
                    <TableCell align="center" sx={cellSx}>
                      {item.unit || '—'}
                    </TableCell>
                    <TableCell sx={{ ...numberSx, fontWeight: 600, color: '#1e3a8a' }}>
                      {formatMoney(item.price)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...numberSx, fontWeight: 700, color: '#2563eb' }}>
                      {formatMoney(item.qtyImport)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...numberSx, color: '#16a34a' }}>
                      {formatMoney(item.km)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...numberSx, fontWeight: 700, color: '#d97706' }}>
                      {formatMoney(item.qtyExport)}
                    </TableCell>
                    <TableCell align="center" sx={{ ...numberSx, fontWeight: 800, color: Number(item.qtyStock) < 0 ? '#e11d48' : '#059669' }}>
                      {formatStock(item.qtyStock)}
                    </TableCell>
                    <TableCell align="center" sx={numberSx}>
                      {formatMoney(item.weight)}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: '#475569' }}>
                      {item.food || '—'}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, color: '#475569' }}>
                      {item.medicine || '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                    <FileSpreadsheet size={48} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
                      Chưa có dữ liệu trong bảng
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* DÒNG TỔNG CỘNG HỆ THỐNG */}
              {filteredItems.length > 0 && (
                <TableRow sx={{ bgcolor: "#e0f2fe" }}>
                  <TableCell colSpan={5} sx={{ ...cellSx, fontWeight: 800, color: "#0369a1", textAlign: "right", textTransform: "uppercase" }}>
                    TỔNG CỘNG HỆ THỐNG:
                  </TableCell>
                  <TableCell align="center" sx={{ ...numberSx, fontWeight: 800, color: "#1d4ed8", fontSize: '0.85rem' }}>
                    {totalImport.toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell sx={cellSx} />
                  <TableCell align="center" sx={{ ...numberSx, fontWeight: 800, color: "#b45309", fontSize: '0.85rem' }}>
                    {totalExport.toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell align="center" sx={{ ...numberSx, fontWeight: 900, color: "#047857", fontSize: '0.85rem' }}>
                    {totalStock.toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell colSpan={3} sx={cellSx} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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