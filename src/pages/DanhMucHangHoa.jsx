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
  TextField,
  Button,
  InputAdornment,
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";

import {
  Search,
  Printer,
  Save,
  Plus,
  Package,
  Download
} from 'lucide-react';

import ExcelJS from 'exceljs';

// Import KhoContext chung
import { useKho } from '../contexts/KhoContext';

// Import Firebase và Firestore (dùng cho tải và lưu dữ liệu)
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { xuatExcelDanhMucHangHoa } from '../utils/xuatExcelDanhMucHangHoa';
import { printDanhMucHangHoa } from '../utils/printDanhMucHangHoa';

/**
 * Hàm tạo Document ID an toàn không dấu, không khoảng trắng từ tên hàng
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

// Style cho Bảng
const headerSx = {
  bgcolor: "#1e3a8a",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "0.85rem",
  textAlign: "center",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  px: 1,
  py: 1.2,
  border: "1px solid #1e3a8a",
};

const cellSx = {
  px: 1.5,
  py: 0.8,
  fontSize: "0.85rem",
  verticalAlign: "middle",
  border: "1px solid #cbd5e1",
};

export default function DanhMucHangHoa() {
  // Lấy dữ liệu từ KhoContext
  const khoContext = (() => {
    try { return useKho(); } catch { return null; }
  })();

  const [localItems, setLocalItems] = useState([]);
  const items = khoContext ? khoContext.items : localItems;
  const setItems = khoContext ? khoContext.setItems : setLocalItems;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null); // Trạng thái ô đang chỉnh sửa { id, field }
  
  // Quản lý các ID dòng thực sự bị thay đổi/thêm mới
  const [changedIds, setChangedIds] = useState(new Set());
  const [savingFirestore, setSavingFirestore] = useState(false);
  const [, setLoadingFirestore] = useState(false);

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

  // 🌟 TẢI DỮ LIỆU TỪ FIRESTORE
  const loadFromFirestore = useCallback(async (force = false) => {
    if (!force && items && items.length > 0) return;
    
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
        setChangedIds(new Set());
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu Firestore:", error);
    } finally {
      setLoadingFirestore(false);
    }
  }, [items, setItems]);

  useEffect(() => {
    if (!items || items.length === 0) {
      loadFromFirestore(false);
    }
  }, [items, loadFromFirestore]);

  // Lọc tìm kiếm
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

  // Thay đổi giá trị dòng & ghi nhận ID bị thay đổi
  const handleItemChange = (itemId, field, value) => {
    setItems(prevItems =>
      prevItems.map(item => (item.id === itemId || item.stt === itemId) ? { ...item, [field]: value } : item)
    );
    setChangedIds(prev => new Set(prev).add(itemId));
  };

  // Thêm dòng mới
  const handleAddRow = () => {
    const newId = Date.now();
    const newItem = {
      id: newId,
      stt: items.length + 1,
      name: 'Mặt hàng mới',
      company: 'Công ty',
      unit: 'Bao',
    };
    setItems(prev => [...prev, newItem]);
    setChangedIds(prev => new Set(prev).add(newId));
    setEditingCell({ id: newId, field: 'name' });
  };

  // 🌟 LƯU CẬP NHẬT LÊN FIRESTORE (Tương tự trang CapNhatDonGia)
  const handleSaveToFirestore = async () => {
    if (changedIds.size === 0) {
      setSnackbar({
        open: true,
        message: "Không có thay đổi nào để cập nhật!",
        severity: "warning",
      });
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
          updatedAt: Date.now()
        }, { merge: true });
      }

      setChangedIds(new Set());
      setSnackbar({
        open: true,
        message: `Đã cập nhật thành công cho ${itemsToUpdate.length} mặt hàng!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi ghi Firestore:", error);
      setSnackbar({
        open: true,
        message: `Lỗi khi ghi dữ liệu lên Firestore: ${error.message}`,
        severity: "error",
      });
    } finally {
      setSavingFirestore(false);
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    xuatExcelDanhMucHangHoa({
      items: filteredItems, // Xuất danh sách đã lọc (hoặc truyền 'items' để xuất toàn bộ)
      setSnackbar
    });
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 1, sm: 2 }, bgcolor: '#f1f5f9', minHeight: '100vh', boxSizing: 'border-box' }}>
      <Paper elevation={2} sx={{ width: '100%', maxWidth: '800px', mx: 'auto', p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: '#fff' }}>

        {/* THANH ĐIỀU HƯỚNG BÊN TRÊN */}
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
                onClick={() => printDanhMucHangHoa({
                  items: filteredItems, // In danh sách đã lọc theo từ khóa (hoặc truyền 'items' nếu muốn in toàn bộ)
                  searchTerm
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
        </Box>

        {/* TIÊU ĐỀ PHONG CÁCH HÓA ĐƠN */}
        <Box sx={{ textAlign: 'center', mb: 2, mt: -2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e3a8a', letterSpacing: 1, textTransform: 'uppercase' }}>
            DANH MỤC HÀNG HÓA
          </Typography>
        </Box>

        {/* Ô TÌM KIẾM VÀ TRẠNG THÁI Thay Đổi */}
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm tên hàng, công ty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              ● Có {changedIds.size} mặt hàng thay đổi chưa lưu
            </Typography>
          )}
        </Box>

        {/* BẢNG DỮ LIỆU */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            mb: 1.5,
            borderColor: '#cbd5e1',
            overflowX: 'auto',
            maxHeight: 600,
            '&::-webkit-scrollbar': { width: 6, height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 }
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 600, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '300px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {["STT", "TÊN HÀNG", "CÔNG TY", "ĐVT"].map((label) => (
                  <TableCell
                    key={label}
                    align="center"
                    sx={{ ...headerSx, textAlign: "center" }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => {
                  const itemKey = item.id || item.stt;

                  return (
                    <TableRow key={itemKey} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      {/* CỘT STT */}
                      <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e3a8a', bgcolor: '#f8fafc' }}>
                        {index + 1}
                      </TableCell>

                      {/* CỘT TÊN HÀNG */}
                      <TableCell
                        align="left"
                        onClick={() => setEditingCell({ id: itemKey, field: 'name' })}
                        sx={{ ...cellSx, cursor: 'pointer', fontWeight: 700, color: '#0f172a' }}
                      >
                        {editingCell?.id === itemKey && editingCell?.field === 'name' ? (
                          <TextField
                            size="small"
                            autoFocus
                            fullWidth
                            value={item.name || ''}
                            onChange={(e) => handleItemChange(itemKey, 'name', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                            sx={{ '& .MuiInputBase-input': { p: '2px 6px', fontSize: '0.85rem', fontWeight: 700 } }}
                          />
                        ) : (
                          item.name || '—'
                        )}
                      </TableCell>

                      {/* CỘT CÔNG TY */}
                      <TableCell
                        align="left"
                        onClick={() => setEditingCell({ id: itemKey, field: 'company' })}
                        sx={{ ...cellSx, cursor: 'pointer', color: '#334155', fontWeight: 600 }}
                      >
                        {editingCell?.id === itemKey && editingCell?.field === 'company' ? (
                          <TextField
                            size="small"
                            autoFocus
                            fullWidth
                            value={item.company || ''}
                            onChange={(e) => handleItemChange(itemKey, 'company', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                            sx={{ '& .MuiInputBase-input': { p: '2px 6px', fontSize: '0.85rem', fontWeight: 600 } }}
                          />
                        ) : (
                          item.company || '—'
                        )}
                      </TableCell>

                      {/* CỘT ĐVT */}
                      <TableCell
                        align="center"
                        onClick={() => setEditingCell({ id: itemKey, field: 'unit' })}
                        sx={{ ...cellSx, cursor: 'pointer', color: '#475569', textAlign: 'center' }}
                      >
                        {editingCell?.id === itemKey && editingCell?.field === 'unit' ? (
                          <TextField
                            size="small"
                            autoFocus
                            fullWidth
                            value={item.unit || ''}
                            onChange={(e) => handleItemChange(itemKey, 'unit', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                            sx={{ '& .MuiInputBase-input': { p: '2px 6px', fontSize: '0.85rem', textAlign: 'center' } }}
                          />
                        ) : (
                          item.unit || '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <Package size={40} color="#cbd5e1" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                      Chưa có dữ liệu danh mục hàng hóa
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* NÚT THÊM DÒNG NẰM DƯỚI BẢNG */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleAddRow}
            startIcon={<Plus size={16} />}
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, textTransform: 'none', fontWeight: 600 }}
          >
            Thêm Dòng
          </Button>
        </Box>

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