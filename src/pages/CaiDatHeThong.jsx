import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Settings,
  Download,
  Upload,
  Database,
  ShieldCheck,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase'; // Import file cấu hình Firebase của dự án

export default function CaiDatHeThong() {
  const [loading, setLoading] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [restoreData, setRestoreData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // 🌟 1. CHỨC NĂNG SAO LƯU (BACKUP) DỮ LIỆU TỪ COLLECTION 'CONGNO'
  const handleBackupCongNo = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'CONGNO'));
      const backupList = [];

      querySnapshot.forEach((docSnap) => {
        backupList.push({
          id: docSnap.id,
          ...docSnap.data(),
        });
      });

      if (backupList.length === 0) {
        showSnackbar('Collection CONGNO hiện chưa có dữ liệu để sao lưu!', 'warning');
        setLoading(false);
        return;
      }

      // Tạo file JSON chứa dữ liệu sao lưu
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupList, null, 2));
      const downloadAnchor = document.createElement('a');
      const nowStr = new Date().toISOString().slice(0, 10);
      
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `CONGNO_Backup_${nowStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showSnackbar(`Đã sao lưu thành công ${backupList.length} bản ghi từ CONGNO!`);
    } catch (error) {
      console.error('Lỗi khi sao lưu:', error);
      showSnackbar('Có lỗi xảy ra khi sao lưu dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 2. ĐỌC FILE JSON ĐỂ CHUẨN BỊ PHỤC HỒI
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        if (Array.isArray(jsonData)) {
          setRestoreData(jsonData);
          setOpenRestoreDialog(true);
        } else {
          showSnackbar('Định dạng file sao lưu không hợp lệ!', 'error');
        }
      } catch (err) {
        showSnackbar('Không thể đọc file JSON!', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input file
    event.target.value = '';
  };

  // 🌟 3. THỰC HIỆN PHỤC HỒI (RESTORE) VÀO COLLECTION 'CONGNO'
  const handleConfirmRestore = async () => {
    if (!restoreData || restoreData.length === 0) return;

    setLoading(true);
    setOpenRestoreDialog(false);

    try {
      // Chia nhỏ dữ liệu theo batch (mỗi batch tối đa 500 thao tác của Firestore)
      const chunkSize = 400;
      for (let i = 0; i < restoreData.length; i += chunkSize) {
        const chunk = restoreData.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const { id, ...data } = item;
          // Nếu item có ID thì giữ nguyên ID cũ, nếu không sẽ tự sinh
          const docRef = id ? doc(db, 'CONGNO', id) : doc(collection(db, 'CONGNO'));
          batch.set(docRef, data, { merge: true });
        });

        await batch.commit();
      }

      showSnackbar(`Đã phục hồi thành công ${restoreData.length} bản ghi vào CONGNO!`);
    } catch (error) {
      console.error('Lỗi khi phục hồi:', error);
      showSnackbar('Có lỗi xảy ra trong quá trình phục hồi dữ liệu!', 'error');
    } finally {
      setLoading(false);
      setRestoreData(null);
    }
  };

  
return (
  <Box
    sx={{
      width: '100%',
      maxWidth: '100%',
      mx: 'auto',
      p: { xs: 1, sm: 2 },
      bgcolor: '#eff6ff',
      minHeight: '100vh',
      boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif",
    }}
  >
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: '600px',
        mx: 'auto',
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.045)',
        boxSizing: 'border-box',
      }}
    >
      {/* TIÊU ĐỀ TRANG */}
      {/* TIÊU ĐỀ TRANG VỚI ICON CĂN LÊN TRÊN CÙNG */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
        <Settings size={28} color="#475569" style={{ marginTop: '2px' }} />

        <Box sx={{ minWidth: 0 }}>
            <Typography
            variant="h6"
            sx={{
                fontWeight: 800,
                color: '#0f172a',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                mb: 1,
            }}
            >
            CÀI ĐẶT HỆ THỐNG
            </Typography>

            <Typography
            variant="caption"
            sx={{ color: '#64748b', fontSize: '0.8rem' }}
            >
            Cấu hình thông tin cửa hàng Thuận Phát, phân quyền và sao lưu dữ liệu
            </Typography>
        </Box>
        </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid
        container
        spacing={3}
        sx={{
          width: '100%',
          m: 0,
        }}
      >
        {/* KHỐI 1: SAO LƯU & PHỤC HỒI */}
        <Grid item xs={12} sx={{ width: '100%', minWidth: 0 }}>
          <Card
            variant="outlined"
            sx={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 2.5,
              borderColor: '#cbd5e1',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                  }}
                >
                  <Database size={22} />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: '#1e293b' }}
                >
                  Sao lưu & Phục hồi
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  mb: 2.5,
                  fontSize: '0.85rem',
                }}
              >
                Quản lý an toàn dữ liệu công nợ. Bạn có thể xuất dữ liệu ra file
                <code> .json </code>
                để lưu trữ hoặc nạp lại dữ liệu từ file sao lưu trước đó.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1.5,
                  width: '100%',
                }}
              >
                {/* NÚT SAO LƯU */}
                <Button
                  variant="contained"
                  onClick={handleBackupCongNo}
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Download size={16} />
                    )
                  }
                  sx={{
                    bgcolor: '#2563eb',
                    '&:hover': { bgcolor: '#1d4ed8' },
                    textTransform: 'none',
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  Sao lưu dữ liệu
                </Button>

                {/* NÚT PHỤC HỒI */}
                <Button
                  variant="outlined"
                  component="label"
                  disabled={loading}
                  startIcon={<Upload size={16} />}
                  sx={{
                    borderColor: '#0284c7',
                    color: '#0284c7',
                    '&:hover': {
                      bgcolor: '#f0f9ff',
                      borderColor: '#0369a1',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    flex: 1,
                  }}
                >
                  Phục hồi dữ liệu
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>

              {/* TIẾN TRÌNH XỬ LÝ */}
              {loading && (
                <Box sx={{ width: '50%', mx: 'auto', mt: 2 }}>
                    <LinearProgress sx={{ borderRadius: 1, height: 6 }} />

                    <Typography
                    variant="caption"
                    sx={{
                        color: '#64748b',
                        mt: 0.5,
                        display: 'block',
                        textAlign: 'center',
                    }}
                    >
                    Đang xử lý dữ liệu, vui lòng đợi...
                    </Typography>
                </Box>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* KHỐI 2: THÔNG TIN CỬA HÀNG */}
        <Grid item xs={12} sx={{ width: '100%', minWidth: 0 }}>
          <Card
            variant="outlined"
            sx={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 2.5,
              borderColor: '#cbd5e1',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                  }}
                >
                  <Store size={22} />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: '#1e293b' }}
                >
                  Thông tin Cửa hàng Thuận Phát
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  color: '#334155',
                  fontSize: '0.85rem',
                }}
              >
                <Typography variant="body2">
                  <strong>Tên cửa hàng:</strong> CỬA HÀNG THUẬN PHÁT
                </Typography>

                <Typography variant="body2">
                  <strong>Địa chỉ:</strong> 140 Đường Rừng Sác, Bình Khánh,
                  TP.HCM
                </Typography>

                <Typography variant="body2">
                  <strong>Số điện thoại:</strong> 0938.702.119
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KHỐI 3: BẢO MẬT & PHÂN QUYỀN */}
        <Grid item xs={12} sx={{ width: '100%', minWidth: 0 }}>
          <Card
            variant="outlined"
            sx={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 2.5,
              borderColor: '#cbd5e1',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                  }}
                >
                  <ShieldCheck size={22} />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: '#1e293b' }}
                >
                  Phân quyền & Bảo mật hệ thống
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{ color: '#64748b', fontSize: '0.85rem' }}
              >
                Tài khoản hiện tại được cấp quyền Quản trị viên. Bạn có
                toàn quyền thao tác sao lưu, cập nhật và phục hồi dữ liệu hệ
                thống.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>

    {/* DIALOG XÁC NHẬN PHỤC HỒI DỮ LIỆU */}
    <Dialog
        open={openRestoreDialog}
        onClose={() => setOpenRestoreDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
            sx: {
            borderRadius: "20px",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
            p: 1
            },
        }}
        >
        <DialogContent sx={{ textAlign: "center", px: 3, pt: 4, pb: 2 }}>
            {/* Icon cảnh báo hình tròn nổi bật */}
            <Box
            sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2.5,
                boxShadow: "0 0 0 8px #fee2e2"
            }}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="32" height="32">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            </Box>

            {/* Tiêu đề */}
            <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b", mb: 1 }}>
            Xác nhận phục hồi dữ liệu
            </Typography>

            {/* Nội dung chi tiết */}
            <Typography sx={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5, mb: 1.5 }}>
            Hệ thống phát hiện <Box component="span" sx={{ fontWeight: 700, color: "#0f172a" }}>{restoreData?.length || 0}</Box> bản ghi từ file sao lưu. Thao tác này sẽ ghi đè / cập nhật thêm dữ liệu vào <Box component="span" sx={{ fontWeight: 700, color: "#dc2626" }}>CÔNG NỢ KHÁCH HÀNG</Box>. Bạn có chắc chắn muốn thực hiện?
            </Typography>

            <Typography sx={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>
            Hành động này sẽ ảnh hưởng trực tiếp đến dữ liệu hệ thống.
            </Typography>
        </DialogContent>

        {/* Khu vực nút bấm hành động */}
        <Box sx={{ p: 3, pt: 1, display: "flex", gap: 1.5, justifyContent: "center" }}>
            <Button
            fullWidth
            variant="outlined"
            onClick={() => setOpenRestoreDialog(false)}
            sx={{
                py: 1.2,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: "#475569",
                '&:hover': { bgcolor: "#f1f5f9", borderColor: "#94a3b8" }
            }}
            >
            Hủy bỏ
            </Button>

            <Button
            fullWidth
            variant="contained"
            onClick={handleConfirmRestore}
            sx={{
                py: 1.2,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#dc2626",
                boxShadow: "0 10px 20px rgba(220,38,38,0.25)",
                '&:hover': { bgcolor: "#b91c1c" }
            }}
            >
            Đồng ý phục hồi
            </Button>
        </Box>
        </Dialog>

    {/* THÔNG BÁO SNACKBAR */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%', fontWeight: 600 }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);

}