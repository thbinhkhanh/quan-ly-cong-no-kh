import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  CircularProgress,
  TablePagination
} from "@mui/material";
import AccountBalanceWallet from "@mui/icons-material/AccountBalanceWallet";
import TableChart from "@mui/icons-material/TableChart";
import Groups from "@mui/icons-material/Groups";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import BarChart from "@mui/icons-material/BarChart";
import Inventory2 from "@mui/icons-material/Inventory2";
import Layers from "@mui/icons-material/Layers";
import Settings from "@mui/icons-material/Settings";
import AttachMoney from "@mui/icons-material/AttachMoney";
import {
  Search,
  Printer,
  Upload,
  FileSpreadsheet,
  CloudUpload,
  CloudDownload,
  Plus,
  ArrowLeft,
  Package,
  Download,
  Trash2
} from 'lucide-react';
import ExcelJS from 'exceljs';

// Import Firebase và Firestore
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

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

// 🌟 PHÂN HỆ QUẢN LÝ DANH MỤC HÀNG HÓA (HIỂN THỊ STT, TÊN HÀNG, CÔNG TY, ĐVT)
export function DanhMucHangHoa({ onBack }) {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileName, setFileName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [savingFirestore, setSavingFirestore] = useState(false);
  const [loadingFirestore, setLoadingFirestore] = useState(false);

  // Phân trang để tối ưu tốc độ render UI
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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

  // Tải dữ liệu từ Firestore
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
        });
      });

      if (loadedData.length > 0) {
        setItems(loadedData);
        setFileName("Dữ liệu từ Firestore (DANHMUC)");
        setHasChanges(false);
        setSnackbar({
          open: true,
          message: `Đã tự động tải ${loadedData.length} mặt hàng từ Firestore thành công!`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Collection DANHMUC trên Firestore hiện đang trống!",
          severity: "info",
        });
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu Firestore:", error);
      setSnackbar({
        open: true,
        message: `Lỗi tải dữ liệu Firestore: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoadingFirestore(false);
    }
  }, []);

  useEffect(() => {
    loadFromFirestore();
  }, [loadFromFirestore]);

  // Lọc tìm kiếm tối ưu với useMemo
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

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      if (cell.value.result !== undefined) return cell.value.result;
      if (cell.value.text !== undefined) return cell.value.text;
      return '';
    }
    return cell.value;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const arrayBuffer = file.arrayBuffer ? await file.arrayBuffer() : await new Response(file).arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const parsedData = [];

      worksheet.eachRow((row, rowNumber) => {
        const col1 = String(getCellValue(row.getCell(1))).trim();
        const col2 = String(getCellValue(row.getCell(2))).trim();
        const col3 = String(getCellValue(row.getCell(3))).trim();

        const rowText = `${col1} ${col2} ${col3}`.toUpperCase();

        if (
          !col2 ||
          rowText.includes("STT") ||
          rowText.includes("TÊN HÀNG") ||
          rowText.includes("DANH MỤC") ||
          rowText.includes("CÔNG TY") ||
          rowText === "1" || rowText === "2" || rowText === "3"
        ) {
          return;
        }

        const unit = String(getCellValue(row.getCell(4)) || '');

        parsedData.push({
          id: rowNumber,
          stt: parsedData.length + 1,
          name: col2,
          company: col3,
          unit: unit,
        });
      });

      setItems(parsedData);
      setHasChanges(true);
      setSnackbar({
        open: true,
        message: `Import thành công ${parsedData.length} mặt hàng!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi đọc file Excel:", error);
      setSnackbar({
        open: true,
        message: "Không thể đọc file Excel này. Vui lòng kiểm tra cấu trúc!",
        severity: "error",
      });
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setItems(prevItems =>
      prevItems.map(item => (item.id === itemId || item.stt === itemId) ? { ...item, [field]: value } : item)
    );
    setHasChanges(true);
  };

  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        stt: prev.length + 1,
        name: 'Mặt hàng mới',
        company: 'Công ty',
        unit: 'Bao',
      },
    ]);
    setHasChanges(true);
  };

  const handleSaveToFirestore = async () => {
    if (items.length === 0) {
      setSnackbar({ open: true, message: "Không có dữ liệu để ghi lên Firestore!", severity: "warning" });
      return;
    }

    try {
      setSavingFirestore(true);
      const danhMucRef = collection(db, "DANHMUC");

      for (const item of items) {
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

      setHasChanges(false);
      setSnackbar({ open: true, message: `Đã cập nhật danh mục ${items.length} mặt hàng lên Firestore thành công!`, severity: "success" });
    } catch (error) {
      console.error("Lỗi ghi Firestore:", error);
      setSnackbar({ open: true, message: `Lỗi khi ghi dữ liệu lên Firestore: ${error.message}`, severity: "error" });
    } finally {
      setSavingFirestore(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh mục hiện tại trên bảng không?')) {
      setItems([]);
      setFileName('');
      setHasChanges(false);
      setSnackbar({ open: true, message: "Đã xóa toàn bộ dữ liệu danh mục!", severity: "info" });
    }
  };

  const handleExportExcel = async () => {
    if (items.length === 0) {
      setSnackbar({ open: true, message: "Chưa có dữ liệu để xuất file!", severity: "warning" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DanhMucHangHoa');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'TÊN HÀNG', key: 'name', width: 35 },
      { header: 'CÔNG TY', key: 'company', width: 25 },
      { header: 'ĐVT', key: 'unit', width: 12 },
    ];

    items.forEach((item, idx) => {
      worksheet.addRow({
        stt: item.stt || idx + 1,
        name: item.name,
        company: item.company,
        unit: item.unit,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Muc_Hang_Hoa_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();

    setSnackbar({ open: true, message: "Đã xuất file Excel danh mục thành công!", severity: "success" });
  };

  const headerSx = { bgcolor: "#c7e8f8", color: "#0000ff", fontWeight: 800, fontSize: "0.85rem", textAlign: "center", border: "1px solid #7dd3fc", px: 1.5, py: 1.25 };
  const cellSx = { px: 1.5, py: 1, fontSize: "0.85rem", border: "1px solid #e2e8f0" };

  return (
    <Box sx={{ width: '100%', mx: 'auto', p: { xs: 1, sm: 2 }, color: '#334155', bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, sm: 3 }, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fff' }}>
        
        {/* THANH ĐIỀU HƯỚNG QUAY LẠI */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button variant="outlined" size="small" onClick={onBack} startIcon={<ArrowLeft size={16} />} sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 600 }}>
            Quay lại Dashboard
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasChanges && <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', bgcolor: '#fee2e2', px: 1.5, py: 0.5, borderRadius: 1 }}>● Có sự thay đổi chưa lưu</Typography>}
            <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
              {fileName ? <Box component="span" sx={{ color: '#15803d', bgcolor: '#f0fdf4', px: 2, py: 0.5, borderRadius: 2, border: '1px solid #bbf7d0', fontWeight: 600 }}>📄 Nguồn: {fileName}</Box> : "Sẵn sàng"}
            </Typography>
          </Box>
        </Box>

        {/* TIÊU ĐỀ & THANH CÔNG CỤ */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2, mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e3a8a", mb: 0.5 }}>DANH MỤC HÀNG HÓA</Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "#64748b", fontStyle: "italic" }}>Quản lý danh sách STT, Tên hàng, Công ty và ĐVT đồng bộ với Firestore.</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button variant="contained" size="small" onClick={loadFromFirestore} disabled={loadingFirestore} startIcon={loadingFirestore ? <CircularProgress size={16} color="inherit" /> : <CloudDownload size={16} />} sx={{ bgcolor: '#0284c7' }}>
              {loadingFirestore ? "Đang tải..." : "Tải từ Firestore"}
            </Button>
            <Button component="label" variant="contained" size="small" startIcon={<Upload size={16} />} sx={{ bgcolor: '#16a34a' }}>
              Import Excel
              <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} />
            </Button>
            <Button variant="contained" size="small" onClick={handleAddRow} startIcon={<Plus size={16} />} sx={{ bgcolor: '#2563eb' }}>
              Thêm Dòng
            </Button>
            {items.length > 0 && (
              <Button variant="contained" size="small" onClick={handleSaveToFirestore} disabled={savingFirestore} startIcon={<CloudUpload size={16} />} sx={{ bgcolor: '#9333ea' }}>
                {savingFirestore ? "Đang ghi..." : "Ghi Firestore"}
              </Button>
            )}
            <Button variant="contained" size="small" onClick={handleExportExcel} startIcon={<Download size={16} />} sx={{ bgcolor: '#0d9488' }}>
              Xuất Excel
            </Button>
            {items.length > 0 && (
              <Button variant="contained" size="small" onClick={handleClearData} startIcon={<Trash2 size={16} />} sx={{ bgcolor: '#dc2626' }}>
                Xóa Bảng
              </Button>
            )}
            <Button variant="outlined" size="small" onClick={() => window.print()} startIcon={<Printer size={16} />} sx={{ borderColor: '#475569', color: '#475569' }}>
              In Bảng
            </Button>
          </Box>
        </Box>

        {/* THỐNG KÊ TỔNG QUAN */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tổng Số Mặt Hàng</Typography>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', mt: 0.5 }}>{items.length.toLocaleString('vi-VN')}</Typography>
            </Box>
            <Box sx={{ p: 1, bgcolor: '#eff6ff', color: '#2563eb', borderRadius: 1.5 }}><Package size={22} /></Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Đang Hiển Thị</Typography>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', mt: 0.5 }}>{filteredItems.length.toLocaleString('vi-VN')}</Typography>
            </Box>
            <Box sx={{ p: 1, bgcolor: '#f0fdf4', color: '#16a34a', borderRadius: 1.5 }}><FileSpreadsheet size={22} /></Box>
          </Paper>
        </Box>

        {/* THANH TÌM KIẾM */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm tên hàng, công ty..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 320 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} color="#94a3b8" /></InputAdornment> }}
          />
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Hiển thị: <b>{filteredItems.length}</b> / <b>{items.length}</b> dòng
          </Typography>
        </Box>

        {/* BẢNG DỮ LIỆU */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 550 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 700, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: '70px' }} />
              <col style={{ width: '380px' }} />
              <col style={{ width: '250px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <TableHead>
              <TableRow>
                {["STT", "Tên hàng", "Công ty", "ĐVT"].map((label) => (
                  <TableCell key={label} sx={headerSx}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => {
                  const itemKey = item.id || item.stt;
                  return (
                    <TableRow key={itemKey} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#1e3a8a', bgcolor: '#f8fafc' }}>
                        {item.stt}
                      </TableCell>
                      <TableCell sx={{ ...cellSx, fontWeight: 700, color: '#0f172a' }}>
                        <TextField
                          variant="standard"
                          fullWidth
                          value={item.name || ''}
                          onChange={(e) => handleItemChange(itemKey, 'name', e.target.value)}
                          InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: '#334155', fontWeight: 600 }}>
                        <TextField
                          variant="standard"
                          fullWidth
                          value={item.company || ''}
                          onChange={(e) => handleItemChange(itemKey, 'company', e.target.value)}
                          InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem', color: '#334155', fontWeight: 600 } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ ...cellSx, color: '#475569' }}>
                        <TextField
                          variant="standard"
                          fullWidth
                          value={item.unit || ''}
                          onChange={(e) => handleItemChange(itemKey, 'unit', e.target.value)}
                          inputProps={{ style: { textAlign: 'center' } }}
                          InputProps={{ disableUnderline: true, sx: { fontSize: '0.85rem', color: '#475569' } }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <FileSpreadsheet size={48} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>Chưa có dữ liệu danh mục hàng hóa</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Số dòng/trang:"
        />
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// 🌟 DASHBOARD CARD COMPONENT
function DashboardCard({ item, onClick }) {
  return (
    <Box
      onClick={onClick}
      className="dashboard-card"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#fff",
        borderRadius: "24px",
        p: { xs: 2, sm: 2.5 },
        
        // 🛠️ TĂNG CHIỀU CAO THẺ TẠI ĐÂY:
        // Cũ: height: { xs: 165, sm: 180 }
        // Mới: Đổi sang minHeight hoặc tăng số pixel tùy nhu cầu (ví dụ: 220px đến 240px)
        minHeight: { xs: 210, sm: 230 }, 

        cursor: "pointer",
        border: "1px solid #e5e7eb",
        transition: "all .25s ease",
        display: "flex",
        flexDirection: "column",
        justify: "space-between",

        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 15px 35px rgba(0,0,0,0.12)",
          borderColor: item.color,
        },

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 5,
          background: item.color,
        },
      }}
    >
      {/* ICON */}
      <Box
        sx={{
          width: { xs: 46, sm: 54 },
          height: { xs: 46, sm: 54 },
          flexShrink: 0,
          borderRadius: "18px",
          bgcolor: `${item.color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          "& svg": {
            fontSize: { xs: 24, sm: 28 },
          },
        }}
      >
        {item.icon}
      </Box>

      {/* TITLE & DESCRIPTION */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            mt: 2,
            fontWeight: 700,
            fontSize: { xs: 14, sm: 16 },
            color: "#0f172a",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.label}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </Typography>
      </Box>

      {/* ARROW */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          className="dashboard-arrow"
          sx={{
            width: 34,
            height: 34,
            borderRadius: "12px",
            bgcolor: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            transition: ".2s",

            ".dashboard-card:hover &": {
              bgcolor: item.color,
              color: "#fff",
            },
          }}
        >
          →
        </Box>
      </Box>
    </Box>
  );
}

// 🌟 MAIN DASHBOARD
export default function Dashboard({ onSelectModule }) {
  const cards = [
    {
      id: "hoa-don",
      label: "Hóa đơn",
      description:
        "Lập, in và lưu trữ hóa đơn bán hàng, phiếu thu tiền theo mẫu chuẩn Thuận Phát",
      icon: <ReceiptLong sx={{ fontSize: 28, color: "#9333ea" }} />,
      color: "#9333ea",
    },
    {
      id: "cong-no-kh",
      label: "Quản lý Công nợ KH",
      description:
        "Theo dõi chi tiết giao dịch mua hàng, thanh toán và dư nợ của từng khách hàng",
      icon: <AccountBalanceWallet sx={{ fontSize: 28, color: "#2563eb" }} />,
      color: "#2563eb",
    },
    {
      id: "thanh-toan-cong-no",
      label: "Thanh toán & Công nợ",
      description: "Theo dõi tổng hợp công nợ và thực hiện thanh toán nhanh theo khách hàng",
      icon: <Layers sx={{ fontSize: 28, color: "#e11d48" }} />,
      color: "#e11d48",
      path: "/thanh-toan-cong-no", // Thêm đường dẫn tới trang mới tạo
    },
    {
      id: "cap-nhat-don-gia",
      label: "Cập nhật Đơn giá",
      description:
        "Cập nhật bảng giá bán, công ty cung cấp và đơn vị tính cho từng mặt hàng",
      icon: <AttachMoney sx={{ fontSize: 28, color: "#ca8a04" }} />,
      color: "#ca8a04",
    },
    {
      id: "danh-muc-vt",
      label: "Danh mục hàng hóa",
      description:
        "Quản lý danh sách mặt hàng, tên công ty, ĐVT",
      icon: <Inventory2 sx={{ fontSize: 28, color: "#0d9488" }} />,
      color: "#0d9488",
    },
    {
      id: "nhap-xuat-kho",
      label: "Quản lý Nhập - Xuất",
      description:
        "Theo dõi chi tiết số lượng nhập, xuất, khuyến mãi và tồn kho thực tế",
      icon: <TableChart sx={{ fontSize: 28, color: "#16a34a" }} />,
      color: "#16a34a",
    },
    
    {
      id: "danh-sach-kh",
      label: "Danh sách Khách hàng",
      description:
        "Quản lý thông tin liên hệ, địa chỉ và tổng hợp dư nợ toàn bộ khách hàng",
      icon: <Groups sx={{ fontSize: 28, color: "#4f46e5" }} />,
      color: "#4f46e5",
    },
    
    {
      id: "bao-cao-thong-ke",
      label: "Doanh số Bán hàng",
      description:
        "Tổng hợp doanh số bán hàng, chi tiết thanh toán và dư nợ theo ngày, khách hàng, công ty hoặc mặt hàng",
      icon: <BarChart sx={{ fontSize: 28, color: "#d97706" }} />,
      color: "#d97706",
    },
    
    {
      id: "cai-dat",
      label: "Cài đặt hệ thống",
      description:
        "Cấu hình thông tin cửa hàng Thuận Phát, phân quyền và sao lưu dữ liệu",
      icon: <Settings sx={{ fontSize: 28, color: "#475569" }} />,
      color: "#475569",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f6f8",
        p: { xs: 2, md: 3 },
        fontFamily:
          '"Segoe UI", "Arial", "Helvetica", "Noto Sans", sans-serif',
      }}
    >
      <Box
        sx={{
          maxWidth: 1400,
          mx: "auto",
          width: "100%",
        }}
      >
        {/* TITLE */}
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            color: "#1e3a8a",
            mb: 3,
            fontFamily:
              '"Segoe UI", "Arial", "Helvetica", "Noto Sans", sans-serif',
          }}
        >
          CHỨC NĂNG CHÍNH
        </Typography>

        {/* GRID */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
          {cards.map((item) => (
            <Box key={item.id} sx={{ minWidth: 0 }}>
              <DashboardCard
                item={item}
                onClick={() => onSelectModule(item.id)}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}