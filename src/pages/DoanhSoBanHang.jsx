import React, { useState, useMemo, useEffect } from 'react';
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
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Stack,
  Card,
  IconButton, // 👈 Thêm dòng này
  Tooltip     // 👈 Thêm dòng này
} from '@mui/material';
import {
  Search,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  Users,
  Package,
  TrendingUp,
  CreditCard,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useCongNo } from '../contexts/CongNoContext';
import { taiCongNo } from '../utils/taiCongNo';
import { xuatExcelDoanhSoBanHang } from '../utils/xuatExcelDoanhSoBanHang';
import { printDoanhSoBanHang } from '../utils/printDoanhSoBanHang';

export default function DoanhSoBanHang() {
  const { items, updateCongNoData } = useCongNo();

  // Trạng thái bộ lọc: 'day', 'customer', 'item'
  const [filterType, setFilterType] = useState('customer');
  const [sortByName, setSortByName] = useState(true);
  const [sortByAmount, setSortByAmount] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 🌟 TỰ ĐỘNG TẢI DỮ LIỆU TỪ CONGNO NẾU CHƯA CÓ TRONG CONTEXT
  useEffect(() => {
    if (!items || items.length === 0) {
      const fetchInitialData = async () => {
        setLoading(true);
        try {
          await taiCongNo('ALL', false, updateCongNoData);
        } catch (error) {
          console.error("Lỗi tải dữ liệu doanh số từ Firestore:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [items, updateCongNoData]);

  // 🌟 HÀM LÀM MỚI DỮ LIỆU TỪ FIRESTORE
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await taiCongNo('ALL', true, updateCongNoData);
    } catch (error) {
      console.error("Lỗi làm mới dữ liệu từ Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chuyển chuỗi ngày sang Date an toàn
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Format Date object về dạng 'YYYY-MM-DD' để gán vào input type="date"
  const formatDateToYYYYMMDD = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tự động tìm ngày nhỏ nhất và lớn nhất từ dữ liệu items
  const minMaxDates = useMemo(() => {
    if (!items || items.length === 0) return { min: '', max: '' };

    let minDate = null;
    let maxDate = null;

    items.forEach((item) => {
      const d = parseDate(item.date);
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    return {
      min: formatDateToYYYYMMDD(minDate),
      max: formatDateToYYYYMMDD(maxDate),
    };
  }, [items]);

  // Trạng thái khoảng ngày khi chọn "Theo ngày"
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cập nhật mặc định khi dữ liệu items thay đổi và minMaxDates đã sẵn sàng
  useEffect(() => {
    if (minMaxDates.min && !startDate) setStartDate(minMaxDates.min);
    if (minMaxDates.max && !endDate) setEndDate(minMaxDates.max);
  }, [minMaxDates]);

  // Ép kiểu dữ liệu tiền tệ an toàn
  const parseNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Định dạng tiền tệ VNĐ đồng bộ
  const formatMoney = (val) => {
    const num = parseNumber(val);
    return num.toLocaleString('vi-VN');
  };

  // Xử lý Gom nhóm & Lọc dữ liệu
  const displayData = useMemo(() => {
    if (!items || items.length === 0) return [];

    let filteredItems = [...items];

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filteredItems = filteredItems.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate ? itemDate >= start : true;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredItems = filteredItems.filter((item) => {
        const itemDate = parseDate(item.date);
        return itemDate ? itemDate <= end : true;
      });
    }

    // 1. GOM NHÓM THEO NGÀY
    if (filterType === 'day') {
      const dateMap = {};

      filteredItems.forEach((item) => {
        const dateVal = (item.date || 'CHƯA PHÂN LOẠI').trim();

        if (!dateMap[dateVal]) {
          dateMap[dateVal] = { name: dateVal, amountNum: 0, paidNum: 0 };
        }

        const amount = parseNumber(item.amountNum ?? item.amount ?? item.totalAmount ?? item.thanhTien);
        const paid = parseNumber(item.paidNum ?? item.paid ?? item.totalPaid ?? item.daThanhToan);

        dateMap[dateVal].amountNum += amount;
        dateMap[dateVal].paidNum += paid;
      });

      let groupedList = Object.values(dateMap);

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        groupedList = groupedList.filter((item) => item.name.toLowerCase().includes(term));
      }

      groupedList.sort((a, b) => {
        const dA = parseDate(a.name);
        const dB = parseDate(b.name);
        if (dA && dB) return dA - dB;
        return a.name.localeCompare(b.name);
      });

      return groupedList;
    }

    // 2. GOM NHÓM THEO KHÁCH HÀNG
    if (filterType === 'customer') {
      const customerMap = {};

      filteredItems.forEach((item) => {
        const custName = (item.customer || item.customerName || 'KHÁCH LẺ').trim();

        if (!customerMap[custName]) {
          customerMap[custName] = { name: custName, amountNum: 0, paidNum: 0 };
        }

        const amount = parseNumber(item.amountNum ?? item.amount ?? item.totalAmount ?? item.thanhTien);
        const paid = parseNumber(item.paidNum ?? item.paid ?? item.totalPaid ?? item.daThanhToan);

        customerMap[custName].amountNum += amount;
        customerMap[custName].paidNum += paid;
      });

      let groupedList = Object.values(customerMap);

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        groupedList = groupedList.filter((item) => item.name.toLowerCase().includes(term));
      }

      if (sortByName) {
        groupedList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
      } else if (sortByAmount) {
        groupedList.sort((a, b) => b.amountNum - a.amountNum);
      }

      return groupedList;
    }

    // 3. GOM NHÓM THEO TÊN HÀNG
    if (filterType === 'item') {
      const itemMap = {};

      filteredItems.forEach((item) => {
        const itemName = (item.itemName || item.tenHang || item.productName || 'HÀNG LẺ TỔNG HỢP').trim();

        if (!itemMap[itemName]) {
          itemMap[itemName] = { name: itemName, amountNum: 0, paidNum: 0 };
        }

        const amount = parseNumber(item.amountNum ?? item.amount ?? item.totalAmount ?? item.thanhTien);
        const paid = parseNumber(item.paidNum ?? item.paid ?? item.totalPaid ?? item.daThanhToan);

        itemMap[itemName].amountNum += amount;
        itemMap[itemName].paidNum += paid;
      });

      let groupedList = Object.values(itemMap);

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        groupedList = groupedList.filter((item) => item.name.toLowerCase().includes(term));
      }

      if (sortByName) {
        groupedList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
      } else if (sortByAmount) {
        groupedList.sort((a, b) => b.amountNum - a.amountNum);
      }

      return groupedList;
    }

    return filteredItems;
  }, [items, filterType, searchTerm, sortByName, sortByAmount, startDate, endDate]);

  // Tính tổng cộng hệ thống
  const totals = useMemo(() => {
    return displayData.reduce(
      (acc, item) => {
        const amount = parseNumber(item.amountNum);
        const paid = parseNumber(item.paidNum);
        acc.totalAmount += amount;
        acc.totalPaid += paid;
        acc.totalDebt += amount - paid;
        return acc;
      },
      { totalAmount: 0, totalPaid: 0, totalDebt: 0 }
    );
  }, [displayData]);

  // Tiêu đề cột thứ 2
  const mainColTitle = useMemo(() => {
    if (filterType === 'day') return 'NGÀY';
    if (filterType === 'item') return 'TÊN HÀNG';
    return 'KHÁCH HÀNG';
  }, [filterType]);

  // Xuất Excel
  const handleExportExcel = () => {
    xuatExcelDoanhSoBanHang({
      displayData,
      mainColTitle,
      totals,
      // setSnackbar (nếu có state setSnackbar)
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%', // Đã đổi thành 100% để phủ kín toàn bộ màn hình
        mx: 'auto',
        p: { xs: 1, sm: 2 },
        bgcolor: '#eff6ff', // Màu nền xanh trùng khớp hoàn toàn với vùng 2
        minHeight: '100vh',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: '1200px', // Đưa giới hạn chiều rộng 1200px vào thẻ Paper bên trong
          mx: 'auto',
          p: { xs: 2, sm: 3 },
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#fff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.045)',
          boxSizing: 'border-box',
        }}
      >
        {/* 🌟 HÀNG ĐẦU TIÊN: 3 ICON (LUÔN CĂN TRÁI) & TIÊU ĐỀ (CĂN GIỮA) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            position: 'relative',
          }}
        >
          {/* 3 ICON THAO TÁC LUÔN CĂN TRÁI */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: 'flex-start',
            }}
          >
            <Tooltip title={loading ? "Đang làm mới..." : "Làm mới dữ liệu"}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={loading}
                  sx={{
                    bgcolor: '#2563eb',
                    color: '#fff',
                    '&:hover': { bgcolor: '#1d4ed8' },
                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                    width: 32,
                    height: 32,
                  }}
                >
                  {loading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
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
                onClick={() => printDoanhSoBanHang({
                  displayData,
                  totals: {
                    totalAmount: totals.totalAmount,
                    totalPaid: totals.totalPaid,
                    totalDebt: totals.totalDebt
                  },
                  mainColTitle,
                  filterType,
                  startDate,
                  endDate,
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

          {/* TIÊU ĐỀ DOANH SỐ BÁN HÀNG - CĂN GIỮA */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: '#0f172a',
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              m: 0,
              textAlign: 'center',
              flexGrow: 1,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            DOANH SỐ BÁN HÀNG
          </Typography>
        </Box>

        {/* 🌟 3 THẺ THỐNG KÊ KPI (RỘNG 50%, CĂN GIỮA) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
            maxWidth: { sm: '50%' },
            mx: 'auto',
            mb: 2,
          }}
        >
          <Card
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                p: 0.85,
                borderRadius: 1.5,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
              }}
            >
              <TrendingUp size={18} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem', display: 'block', lineHeight: 1.2 }}>
                TỔNG THÀNH TIỀN
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', lineHeight: 1.25 }}>
                {formatMoney(totals.totalAmount)}
              </Typography>
            </Box>
          </Card>

          <Card
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                p: 0.85,
                borderRadius: 1.5,
                bgcolor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
              }}
            >
              <CreditCard size={18} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem', display: 'block', lineHeight: 1.2 }}>
                ĐÃ THANH TOÁN
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.875rem', lineHeight: 1.25 }}>
                {formatMoney(totals.totalPaid)}
              </Typography>
            </Box>
          </Card>

          <Card
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                p: 0.85,
                borderRadius: 1.5,
                bgcolor: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
              }}
            >
              <Wallet size={18} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem', display: 'block', lineHeight: 1.2 }}>
                CÒN NỢ LẠI
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.875rem', lineHeight: 1.25 }}>
                {formatMoney(totals.totalDebt)}
              </Typography>
            </Box>
          </Card>
        </Box>

        {/* 🌟 KHU VỰC CHÍNH: SIDEBAR BỘ LỌC & BẢNG DỮ LIỆU */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '270px 1fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {/* SIDEBAR BỘ LỌC */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                mb: 1.5,
                pb: 1,
                borderBottom: '1px solid #f1f5f9',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              BỘ LỌC BÁO CÁO
            </Typography>

            <RadioGroup
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ gap: 1.25 }}
            >
              {/* Tùy chọn Theo Ngày */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1.75,
                  borderColor: filterType === 'day' ? '#2563eb' : '#e2e8f0',
                  bgcolor: filterType === 'day' ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <FormControlLabel
                  value="day"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Calendar size={16} color={filterType === 'day' ? '#2563eb' : '#64748b'} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: filterType === 'day' ? 700 : 500 }}>
                        Theo ngày
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />

                {filterType === 'day' && (
                  <Stack spacing={1.5} sx={{ mt: 2, pt: 0.5 }}>
                    <TextField
                      label="Từ ngày"
                      type="date"
                      size="small"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiInputBase-input': { fontSize: '0.8rem' },
                        '& .MuiInputLabel-root': { fontSize: '0.8rem' }
                      }}
                    />
                    <TextField
                      label="Đến ngày"
                      type="date"
                      size="small"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        bgcolor: '#fff',
                        '& .MuiInputBase-input': { fontSize: '0.8rem' },
                        '& .MuiInputLabel-root': { fontSize: '0.8rem' }
                      }}
                    />
                  </Stack>
                )}
              </Paper>

              {/* Tùy chọn Theo Khách Hàng */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1.75,
                  borderColor: filterType === 'customer' ? '#2563eb' : '#e2e8f0',
                  bgcolor: filterType === 'customer' ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <FormControlLabel
                  value="customer"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Users size={16} color={filterType === 'customer' ? '#2563eb' : '#64748b'} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: filterType === 'customer' ? 700 : 500 }}>
                        Theo khách hàng
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />

                {filterType === 'customer' && (
                  <Stack spacing={0.25} sx={{ mt: 0.75, pl: 2.75 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={sortByName}
                          onChange={(e) => {
                            setSortByName(e.target.checked);
                            if (e.target.checked) setSortByAmount(false);
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.8rem', color: '#334155' }}>Sắp xếp theo tên KH</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={sortByAmount}
                          onChange={(e) => {
                            setSortByAmount(e.target.checked);
                            if (e.target.checked) setSortByName(false);
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.8rem', color: '#334155' }}>Sắp xếp theo số tiền</Typography>}
                    />
                  </Stack>
                )}
              </Paper>

              {/* Tùy chọn Theo Tên Hàng */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1.75,
                  borderColor: filterType === 'item' ? '#2563eb' : '#e2e8f0',
                  bgcolor: filterType === 'item' ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <FormControlLabel
                  value="item"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Package size={16} color={filterType === 'item' ? '#2563eb' : '#64748b'} />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: filterType === 'item' ? 700 : 500 }}>
                        Theo tên hàng
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />

                {filterType === 'item' && (
                  <Stack spacing={0.25} sx={{ mt: 0.75, pl: 2.75 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={sortByName}
                          onChange={(e) => {
                            setSortByName(e.target.checked);
                            if (e.target.checked) setSortByAmount(false);
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.8rem', color: '#334155' }}>Sắp xếp theo tên Hàng</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={sortByAmount}
                          onChange={(e) => {
                            setSortByAmount(e.target.checked);
                            if (e.target.checked) setSortByName(false);
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: '0.8rem', color: '#334155' }}>Sắp xếp theo số tiền</Typography>}
                    />
                  </Stack>
                )}
              </Paper>
            </RadioGroup>
          </Paper>

          {/* BẢNG DỮ LIỆU CHÍNH */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Ô TÌM KIẾM */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TextField
                size="small"
                placeholder={`Tìm kiếm ${mainColTitle.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  width: { xs: '100%', sm: 280 },
                  bgcolor: '#f8fafc',
                  '& .MuiInputBase-input': { fontSize: '0.825rem', py: 0.6 }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#94a3b8" />
                    </InputAdornment>
                  ),
                }}
              />
            </Paper>

            {/* BẢNG DỮ LIỆU HIỂN THỊ */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                maxHeight: 580,
                bgcolor: '#fff',
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '65px' }}>
                      STT
                    </TableCell>
                    <TableCell align="left" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5 }}>
                      {mainColTitle}
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '165px' }}>
                      THÀNH TIỀN
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '165px' }}>
                      THANH TOÁN
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '165px' }}>
                      CÒN LẠI
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading && displayData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={30} sx={{ mb: 1, color: '#2563eb' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Đang đồng bộ dữ liệu...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : displayData.length > 0 ? (
                    displayData.map((item, index) => {
                      const amount = parseNumber(item.amountNum);
                      const paid = parseNumber(item.paidNum);
                      const debtVal = amount - paid;

                      return (
                        <TableRow
                          key={item.name || index}
                          hover
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: '#f8fafc' },
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', py: 0.8, px: 1.5, fontSize: '0.85rem' }}>
                            {index + 1}
                          </TableCell>

                          <TableCell align="left" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', py: 0.8, px: 1.5 }}>
                            {item.name}
                          </TableCell>

                          <TableCell align="right" sx={{ fontWeight: 700, color: '#1e293b', py: 0.8, px: 1.5, fontSize: '0.875rem' }}>
                            {formatMoney(amount)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a', py: 0.8, px: 1.5, fontSize: '0.875rem' }}>
                            {formatMoney(paid)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              color: debtVal > 0 ? '#dc2626' : '#475569',
                              py: 0.8,
                              px: 1.5,
                              fontSize: '0.875rem',
                            }}
                          >
                            {formatMoney(debtVal)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <FileSpreadsheet size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                          Không có dữ liệu báo cáo phù hợp
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* DÒNG TỔNG CỘNG HỆ THỐNG */}
                  {displayData.length > 0 && (
                    <TableRow sx={{ bgcolor: '#f0f9ff', borderTop: '2px solid #0284c7' }}>
                      <TableCell colSpan={2} align="center" sx={{ fontWeight: 800, color: '#0369a1', fontSize: '0.875rem', letterSpacing: '0.5px', py: 0.9, px: 1.5 }}>
                        TỔNG CỘNG HỆ THỐNG
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.9rem', py: 0.9, px: 1.5 }}>
                        {formatMoney(totals.totalAmount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', py: 0.9, px: 1.5 }}>
                        {formatMoney(totals.totalPaid)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: totals.totalDebt > 0 ? '#dc2626' : '#0369a1', fontSize: '0.9rem', py: 0.9, px: 1.5 }}>
                        {formatMoney(totals.totalDebt)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
