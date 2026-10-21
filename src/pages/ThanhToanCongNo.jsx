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
  Card,
  Checkbox,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  CreditCard,
  Wallet,
  Search,
  RotateCw,
  Download,
  Printer,
  FileSpreadsheet,
  Building2
} from 'lucide-react';

import { useCongNo } from "../contexts/CongNoContext";
import { taiCongNo, clearCongNoCache, formatCustomerId } from '../utils/taiCongNo';
import ThanhToan from "../dialogs/ThanhToanCongNo"; 
import { xuatExcelTongHopKhachHang } from '../utils/xuatExcelTongHopKhachHang';
import { printThanhToanCongNo } from '../utils/printThanhToanCongNo';

export default function ThanhToanCongNo() {
  const { customersMap, items, updateCongNoData } = useCongNo();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);

  const [sortByName, setSortByName] = useState(true);
  const [sortByAmount, setSortByAmount] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🌟 TỰ ĐỘNG TẢI TỪ FIRESTORE NẾU CONTEXT ĐANG TRỐNG, NGƯỢC LẠI LẤY TỪ CONTEXT
  // 🌟 LUÔN ĐỒNG BỘ DỮ LIỆU TỪ CACHE/CONTEXT MỖI KHI MỞ TRANG NÀY
  useEffect(() => {
    const fetchLatestData = async () => {
      setLoading(true);
      try {
        // force = false để đọc dữ liệu mới nhất từ cache dùng chung, 
        // đồng thời cập nhật thẳng vào Context để bảng tự động nhảy số chuẩn xác
        await taiCongNo("ALL", false, updateCongNoData);
      } catch (error) {
        console.error("Lỗi đồng bộ dữ liệu công nợ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestData();
  }, [updateCongNoData]);

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('vi-VN');
  };

  const parseNumber = (val) => Number(val) || 0;

  // 🌟 NÚT LÀM MỚI: Ép buộc tải mới từ Firestore (forceRefresh = true) và cập nhật Context
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await taiCongNo("ALL", true, updateCongNoData);
    } catch (error) {
      console.error("Lỗi làm mới dữ liệu từ Firestore:", error);
    } finally {
      setLoading(false);
    }
  };


  // 🌟 HÀM TÍNH TOÁN CÔNG NỢ ĐỒNG BỘ CHUẨN XÁC VỚI TRANG CHI TIẾT
  const customerDebtList = useMemo(() => {
    const summary = {};

    // 1. Lấy danh sách tên tất cả khách hàng từ customersMap
    if (customersMap && typeof customersMap === 'object') {
      Object.keys(customersMap).forEach((custKey) => {
        const custData = customersMap[custKey] || {};
        const custName = String(custData.customerName || custKey || '').trim().toUpperCase();
        if (!custName) return;

        summary[custName] = {
          name: custName,
          amountNum: 0,
          paidNum: 0,
          debtNum: 0,
          lastDate: custData.lastDate || '—',
        };
      });
    }

    // 2. TÍNH TỔNG THỰC TẾ TỪ ITEMS (CHI TIẾT GIAO DỊCH)
    // Nếu khách đã bị xóa hết items, tổng mua/trả/nợ của khách đó sẽ chuẩn xác bằng 0
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item) => {
        const rawCustomer = item.customer || item.khachHang || item.customerName || '';
        const cust = String(rawCustomer).trim().toUpperCase();
        if (!cust) return;

        if (!summary[cust]) {
          summary[cust] = {
            name: cust,
            amountNum: 0,
            paidNum: 0,
            debtNum: 0,
            lastDate: item.date || item.ngay || '—',
          };
        }

        const amount = Number(item.amount ?? item.thanhTien ?? item.totalAmount ?? item.total ?? 0);
        const paid = Number(item.paid ?? item.thanhToan ?? item.paidAmount ?? 0);

        summary[cust].amountNum += amount;
        summary[cust].paidNum += paid;
      });
    }

    // 3. Tính dư nợ dư dựa trên tổng mua và đã trả thực tế
    Object.keys(summary).forEach((cust) => {
      summary[cust].debtNum = summary[cust].amountNum - summary[cust].paidNum;
    });

    // 4. Lọc danh sách và sắp xếp
    let list = Object.values(summary);

    if (sortByName) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
    } else if (sortByAmount) {
      list.sort((a, b) => b.amountNum - a.amountNum);
    }

    return list;
  }, [customersMap, items, sortByName, sortByAmount]);

  const displayData = useMemo(() => {
    return customerDebtList.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customerDebtList, searchTerm]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;

    customerDebtList.forEach((item) => {
      totalAmount += item.amountNum;
      totalPaid += item.paidNum;
    });

    const totalDebt = totalAmount - totalPaid;

    return { totalAmount, totalPaid, totalDebt };
  }, [customerDebtList]);

  const mainColTitle = "KHÁCH HÀNG";

  const handleExportExcel = () => {
    xuatExcelTongHopKhachHang({
      displayData,
      totals,
      // setSnackbar (nếu component của thầy có state thông báo Snackbar, có thể truyền vào đây, nếu không có thể bỏ trống)
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        mx: 'auto',
        p: { xs: 1.5, sm: 2.5 },
        bgcolor: '#f1f5f9',
        minHeight: '100vh',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* HEADER & THẺ KPI */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', lg: 'center' },
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={24} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#0f172a',
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                lineHeight: 1.2,
              }}
            >
              THANH TOÁN & CÔNG NỢ
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
              Theo dõi tổng hợp công nợ và thực hiện thanh toán nhanh theo từng khách hàng
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
            minWidth: { lg: '620px' },
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
            <Box sx={{ p: 0.85, borderRadius: 1.5, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
              <TrendingUp size={18} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem', display: 'block', lineHeight: 1.2 }}>
                TỔNG MUA
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
            <Box sx={{ p: 0.85, borderRadius: 1.5, bgcolor: '#f0fdf4', color: '#16a34a', display: 'flex' }}>
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
            <Box sx={{ p: 0.85, borderRadius: 1.5, bgcolor: '#fef2f2', color: '#dc2626', display: 'flex' }}>
              <Wallet size={18} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem', display: 'block', lineHeight: 1.2 }}>
                DƯ NỢ HIỆN TẠI
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '0.875rem', lineHeight: 1.25 }}>
                {formatMoney(totals.totalDebt)}
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* KHU VỰC TOOLBAR & BẢNG DỮ LIỆU */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 260 },
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                label={<Typography sx={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>Sắp xếp theo tên KH</Typography>}
                sx={{ m: 0 }}
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
                label={<Typography sx={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>Sắp xếp theo số tiền</Typography>}
                sx={{ m: 0 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <RotateCw size={16} />
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.825rem',
                borderRadius: 1.75,
                borderColor: '#2563eb',
                color: '#2563eb',
                '&:hover': { bgcolor: '#eff6ff', borderColor: '#1d4ed8' },
                px: 1.5,
                py: 0.5,
              }}
            >
              Làm mới
            </Button>

            <Button
              variant="contained"
              size="small"
              onClick={handleExportExcel}
              startIcon={<Download size={16} />}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.825rem',
                borderRadius: 1.75,
                px: 1.5,
                py: 0.5,
              }}
            >
              Xuất Excel
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={() => printThanhToanCongNo({
                displayData,
                totals,
                searchTerm
              })}
              startIcon={<Printer size={16} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.825rem',
                borderRadius: 1.75,
                borderColor: '#cbd5e1',
                color: '#475569',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                px: 1.5,
                py: 0.5,
              }}
            >
              In Bảng
            </Button>
          </Box>
        </Paper>

        {/* BẢNG DỮ LIỆU */}
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
                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '160px' }}>
                  TỔNG MUA
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '160px' }}>
                  ĐÃ TRẢ
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '160px' }}>
                  DƯ NỢ
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: '#1e293b', color: '#f8fafc', fontWeight: 700, fontSize: '0.825rem', py: 0.8, px: 1.5, width: '130px' }}>
                  THAO TÁC
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading && displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} sx={{ mb: 1, color: '#2563eb' }} />
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Đang lấy dữ liệu từ Context/Firestore...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayData.length > 0 ? (
                displayData.map((item, index) => {
                  const amount = parseNumber(item.amountNum);
                  const paid = parseNumber(item.paidNum);
                  const debtVal = parseNumber(item.debtNum);

                  return (
                    <TableRow key={item.name || index} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f8fafc' }, transition: 'background-color 0.15s ease' }}>
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
                      <TableCell align="right" sx={{ fontWeight: 700, color: debtVal > 0 ? '#dc2626' : '#16a34a', py: 0.8, px: 1.5, fontSize: '0.875rem' }}>
                        {formatMoney(debtVal)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.8, px: 1.5 }}>
                        {debtVal >= 0 && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              setSelectedCustomerForPayment(item.name);
                              setOpenPaymentDialog(true);
                            }}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              py: 0.3,
                              background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                              boxShadow: '0 2px 6px rgba(25,118,210,0.2)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                              }
                            }}
                          >
                            Thanh toán
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <FileSpreadsheet size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                      Không có dữ liệu khách hàng phù hợp
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* TỔNG CỘNG HỆ THỐNG */}
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
                  <TableCell align="center" />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* POPUP THANH TOÁN */}
      <ThanhToan
        open={openPaymentDialog}
        customerName={selectedCustomerForPayment}
        onClose={() => {
          setOpenPaymentDialog(false);
          setSelectedCustomerForPayment(null);
        }}
        onSuccess={() => {
          // 🌟 Tự động gọi lại hàm làm mới sau 300ms để đảm bảo Firestore đã nhận đủ dữ liệu mới
          setTimeout(() => {
            handleRefresh();
          }, 300);
        }}
      />
    </Box>
  );
}