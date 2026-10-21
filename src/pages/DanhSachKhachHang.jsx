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
  InputAdornment,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Download
} from 'lucide-react';

import ExcelJS from 'exceljs';

// Import Firebase và Firestore
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { xuatExcelDanhSachKhachHang } from '../utils/xuatExcelDanhSachKhachHang';
import { printDanhSachKhachHang } from '../utils/printDanhSachKhachHang';

export default function DanhSachKhachHang() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  // 🌟 HÀM TỰ ĐỘNG TẢI DỮ LIỆU TỪ COLLECTION "CONGNO" TRÊN FIRESTORE
  const loadCustomersFromFirestore = useCallback(async () => {
    try {
      setLoadingFirestore(true);
      const congNoRef = collection(db, "CONGNO");
      const querySnapshot = await getDocs(congNoRef);

      const customerMap = new Map(); // Lọc trùng khách hàng dựa trên tên

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        const name = data.tenKhachHang || data.name || data.khachHang || docSnap.id;
        const phone = data.phone || data.dienThoai || data.soDienThoai || '—';
        const address = data.address || data.diaChi || '—';

        if (name && !customerMap.has(name)) {
          customerMap.set(name, {
            id: docSnap.id,
            name: name,
            phone: phone,
            address: address,
          });
        }
      });

      const loadedData = Array.from(customerMap.values()).map((item, index) => ({
        ...item,
        stt: index + 1,
      }));

      if (loadedData.length > 0) {
        setCustomers(loadedData);
        setSnackbar({
          open: true,
          message: `Đã tải ${loadedData.length} khách hàng từ collection CONGNO!`,
          severity: "success",
        });
      } else {
        setCustomers([]);
        setSnackbar({
          open: true,
          message: "Collection 'CONGNO' trên Firestore hiện chưa có dữ liệu khách hàng!",
          severity: "info",
        });
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu khách hàng từ CONGNO:", error);
      setSnackbar({
        open: true,
        message: `Lỗi tải danh sách khách hàng: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingFirestore(false);
    }
  }, []);

  // 🌟 TỰ ĐỘNG TẢI DỮ LIỆU KHI MOUNT
  useEffect(() => {
    loadCustomersFromFirestore();
  }, [loadCustomersFromFirestore]);

  // LỌC DỮ LIỆU TỐI ƯU HIỆU NĂNG
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers || [];
    const term = searchTerm.toLowerCase();
    return (customers || []).filter(item =>
      item && (
        (item.name && item.name.toString().toLowerCase().includes(term)) ||
        (item.phone && item.phone.toString().toLowerCase().includes(term)) ||
        (item.address && item.address.toString().toLowerCase().includes(term))
      )
    );
  }, [customers, searchTerm]);

  // Xuất file Excel
  const handleExportExcel = () => {
    xuatExcelDanhSachKhachHang({
      customers: filteredCustomers, // Xuất danh sách đã tìm kiếm/lọc
      setSnackbar
    });
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
    px: 1,
    py: 0.8,
    fontSize: "0.85rem",
    verticalAlign: "middle",
    border: "1px solid #cbd5e1",
  };

  return (
    <Box
      sx={{
        width: '100%',
        mx: 'auto',
        p: { xs: 1, sm: 2 },
        color: '#334155',
        bgcolor: '#f1f5f9',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: '800px',
          mx: 'auto',
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          bgcolor: '#fff',
          boxSizing: 'border-box',
        }}
      >
        {/* THANH ĐIỀU HƯỚNG BÊN TRÊN */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1, mb: 2 }}>
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

          <Tooltip title="In Danh Sách">
            <IconButton
              size="small"
              onClick={() => printDanhSachKhachHang({
                filteredCustomers,
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

        {/* TIÊU ĐỀ TRANG */}
        <Box sx={{ width: '100%', textAlign: 'center', mb: 2, mt: -2 }}>
          <Typography 
            sx={{ 
              fontSize: "1.2rem", 
              fontWeight: 900, 
              color: "#1e3a8a", 
              textTransform: "uppercase",
              letterSpacing: 1
            }}
          >
            DANH SÁCH KHÁCH HÀNG
          </Typography>
        </Box>

        {/* THANH TÌM KIẾM */}
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm tên, SĐT, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 280,
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
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Hiển thị: <b>{filteredCustomers.length}</b> / <b>{customers.length}</b> khách hàng
          </Typography>
        </Box>

        {/* BẢNG DỮ LIỆU */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            borderColor: '#cbd5e1',
            overflowX: "auto",
            maxHeight: 560,
            mb: 0.5,
            "&::-webkit-scrollbar": { height: 6, width: 6 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 3 },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              minWidth: 600,
              tableLayout: "fixed",
              "& .MuiTableCell-root": { borderColor: "#cbd5e1" },
            }}
          >
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '250px' }} />
            </colgroup>

            <TableHead>
              <TableRow>
                {["STT", "Tên khách hàng", "Số điện thoại", "Địa chỉ"].map((label) => (
                  <TableCell
                    key={label}
                    align="center"
                    sx={headerSx}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((item) => (
                  <TableRow key={item.id || item.stt} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e3a8a', bgcolor: '#f8fafc' }}>
                      {item.stt}
                    </TableCell>

                    <TableCell align="left" sx={{ ...cellSx, fontWeight: 700, color: '#0f172a' }}>
                      {item.name}
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellSx, fontWeight: 600, color: '#2563eb' }}>
                      {item.phone}
                    </TableCell>

                    <TableCell align="center" sx={{ ...cellSx, color: '#475569' }}>
                      {item.address}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <FileSpreadsheet size={40} color="#cbd5e1" style={{ marginBottom: 6 }} />
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                      Chưa có dữ liệu khách hàng trong bảng
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* NOTIFICATION SNACKBAR */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}