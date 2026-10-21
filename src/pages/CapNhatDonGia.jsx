import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  InputAdornment,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from "@mui/material";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Save,
  Download
} from 'lucide-react';

import ExcelJS from 'exceljs';
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

const CACHE_KEY = "DANHMUC_DONGIA_CACHE";

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

export default function CapNhatDonGia() {
  // Lấy dữ liệu từ Cache local trước để tải tức thì (0ms)
  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [changedIds, setChangedIds] = useState(new Set());
  const [savingFirestore, setSavingFirestore] = useState(false);
  const [loadingFirestore, setLoadingFirestore] = useState(false);

  // Thêm Phân Trang để tối ưu render DOM
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Tải từ Firestore và lưu Cache
  const loadFromFirestore = useCallback(async () => {
    try {
      setLoadingFirestore(true);
      const danhMucRef = collection(db, "DANHMUC");
      const querySnapshot = await getDocs(danhMucRef);

      const loadedData = [];
      let index = 1;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedData.push({
          id: docSnap.id,
          stt: index++,
          name: data.name || docSnap.id,
          company: data.company || '',
          unit: data.unit || '',
          price: Number(data.price) || 0,
        });
      });

      if (loadedData.length > 0) {
        setItems(loadedData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(loadedData));
        setChangedIds(new Set());
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu Firestore:", error);
    } finally {
      setLoadingFirestore(false);
    }
  }, []);

  useEffect(() => {
    loadFromFirestore();
  }, [loadFromFirestore]);

  // Lọc dữ liệu theo từ khóa tìm kiếm
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

  // Cắt danh sách theo trang
  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const handlePriceChange = (itemId, value) => {
    const rawNum = String(value).replace(/[^0-9]/g, '');
    const newPrice = Number(rawNum) || 0;

    setItems(prevItems => {
      const updated = prevItems.map(item => {
        const currentKey = item.id || item.stt;
        if (currentKey === itemId) {
          return { ...item, price: newPrice };
        }
        return item;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      return updated;
    });

    setChangedIds(prev => new Set(prev).add(itemId));
  };

  const handleSaveToFirestore = async () => {
    if (changedIds.size === 0) {
      setSnackbar({ open: true, message: "Không có đơn giá nào thay đổi!", severity: "warning" });
      return;
    }

    const itemsToUpdate = items.filter(item => changedIds.has(item.id || item.stt));

    try {
      setSavingFirestore(true);
      const danhMucRef = collection(db, "DANHMUC");

      for (const item of itemsToUpdate) {
        const docId = formatCustomerId(item.name);
        const productDocRef = doc(danhMucRef, docId);

        await setDoc(productDocRef, {
          productId: docId,
          name: item.name || '',
          company: item.company || '',
          unit: item.unit || '',
          price: Number(item.price) || 0,
          updatedAt: Date.now()
        }, { merge: true });
      }

      setChangedIds(new Set());
      setSnackbar({
        open: true,
        message: `Đã cập nhật đơn giá thành công cho ${itemsToUpdate.length} mặt hàng!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi ghi Firestore:", error);
      setSnackbar({ open: true, message: `Lỗi khi ghi dữ liệu: ${error.message}`, severity: "error" });
    } finally {
      setSavingFirestore(false);
    }
  };

  const handleExportExcel = async () => {
    if (items.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BangDonGia');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'TÊN HÀNG', key: 'name', width: 35 },
      { header: 'CÔNG TY', key: 'company', width: 25 },
      { header: 'ĐVT', key: 'unit', width: 12 },
      { header: 'ĐƠN GIÁ', key: 'price', width: 18 },
    ];

    items.forEach((item, idx) => {
      worksheet.addRow({
        stt: item.stt || idx + 1,
        name: item.name,
        company: item.company,
        unit: item.unit,
        price: item.price,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Cap_Nhat_Don_Gia_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  };

  const formatMoney = (val) => {
    if (!val && val !== 0) return '';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('vi-VN');
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
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 1, sm: 2 }, bgcolor: '#f1f5f9', minHeight: '100vh', boxSizing: 'border-box' }}>
      <Paper elevation={2} sx={{ width: '100%', maxWidth: '800px', mx: 'auto', p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: '#fff' }}>

        {/* THANH CHỨC NĂNG */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title={savingFirestore ? "Đang cập nhật..." : "Cập nhật"}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleSaveToFirestore}
                  disabled={savingFirestore || changedIds.size === 0}
                  sx={{
                    bgcolor: '#9333ea',
                    color: '#fff',
                    '&:hover': { bgcolor: '#7e22ce' },
                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    width: 32,
                    height: 32,
                  }}
                >
                  {savingFirestore ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                </IconButton>
              </span>
            </Tooltip>

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

            <Tooltip title="In Bảng">
              <IconButton
                size="small"
                onClick={() => window.print()}
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
        </Box>

        {/* TIÊU ĐỀ */}
        <Box sx={{ textAlign: 'center', mb: 2, mt: -2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e3a8a', letterSpacing: 1, textTransform: 'uppercase' }}>
            BẢNG CẬP NHẬT ĐƠN GIÁ
          </Typography>
        </Box>

        {/* Ô TÌM KIẾM VÀ THÔNG BÁO */}
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm tên hàng, công ty..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            sx={{
              width: 260,
              '& .MuiOutlinedInput-root': { borderRadius: '4px', fontSize: '0.85rem', bgcolor: '#fff' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94a3b8" />
                </InputAdornment>
              ),
            }}
          />

          {changedIds.size > 0 && (
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', bgcolor: '#fee2e2', px: 1.5, py: 0.5, borderRadius: 1 }}>
              ● Có {changedIds.size} mặt hàng thay đổi giá chưa lưu
            </Typography>
          )}
        </Box>

        {/* BẢNG DỮ LIỆU CÓ PHÂN TRANG */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            borderColor: '#cbd5e1',
            overflowX: 'auto',
            maxHeight: 600,
            '&::-webkit-scrollbar': { width: 6, height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 }
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 700, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '280px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '150px' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {["STT", "TÊN HÀNG", "CÔNG TY", "ĐVT", "ĐƠN GIÁ (VNĐ)"].map((label, idx) => (
                  <TableCell
                    key={label}
                    align={idx === 4 ? "right" : idx === 0 || idx === 3 ? "center" : "left"}
                    sx={{
                      ...headerSx,
                      textAlign: idx === 4 ? "right" : idx === 0 || idx === 3 ? "center" : "left",
                      pr: idx === 4 ? 2 : 1
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loadingFirestore && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 1 }}>
                      Đang tải dữ liệu từ Firestore...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const itemKey = item.id || item.stt;
                  const isChanged = changedIds.has(itemKey);

                  return (
                    <TableRow key={itemKey} hover>
                      <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e3a8a', bgcolor: '#f8fafc' }}>
                        {page * rowsPerPage + index + 1}
                      </TableCell>

                      <TableCell align="left" sx={{ ...cellSx, fontWeight: 700, color: '#0f172a' }}>
                        {item.name}
                      </TableCell>

                      <TableCell align="left" sx={{ ...cellSx, color: '#334155', fontWeight: 600 }}>
                        {item.company || '—'}
                      </TableCell>

                      <TableCell align="center" sx={{ ...cellSx, color: '#475569' }}>
                        {item.unit || '—'}
                      </TableCell>

                      <TableCell align="right" sx={{ ...cellSx, bgcolor: isChanged ? '#fef3c7' : '#fff' }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={formatMoney(item.price)}
                          onChange={(e) => handlePriceChange(itemKey, e.target.value)}
                          sx={{
                            ...gridInputSx('right'),
                            '& input': {
                              fontWeight: 800,
                              color: isChanged ? '#b45309' : '#15803d'
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <FileSpreadsheet size={40} color="#cbd5e1" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                      Chưa có dữ liệu đơn giá trong bảng
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PHÂN TRANG */}
        {filteredItems.length > 0 && (
          <TablePagination
            component="div"
            count={filteredItems.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Số dòng/trang:"
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}