import React, { useState, useEffect, useContext } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Menu,
  Dialog,
  DialogContent,
} from "@mui/material";

// Import các trang
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NhapXuatKho from './pages/NhapXuatKho';
import CongNoKhachHang from './pages/CongNoKhachHang';
import HoaDonBanHang from './pages/HoaDonBanHang';
import CapNhatDonGia from './pages/CapNhatDonGia';
import DanhSachKhachHang from './pages/DanhSachKhachHang';
import DanhMucHangHoa from './pages/DanhMucHangHoa';
import DoanhSoBanHang from './pages/DoanhSoBanHang';
import ThanhToanCongNo from './pages/ThanhToanCongNo';
import CaiDatHeThong from './pages/CaiDatHeThong';

// Import Dialog Đổi mật khẩu
import ChangePasswordDialog from './dialogs/ChangePasswordDialog';

// Import Icon
import { ArrowLeft } from 'lucide-react';
import AppsIcon from "@mui/icons-material/Apps";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded"; // 👤 Icon cho Thuận Phát
import LogoutIcon from "@mui/icons-material/Logout";
import LockResetIcon from "@mui/icons-material/LockReset";
import LoginIcon from "@mui/icons-material/Login";
import CloseIcon from "@mui/icons-material/Close";

// Import Contexts
import { CongNoProvider } from './contexts/CongNoContext';
import { KhoProvider } from './contexts/KhoContext';
import { ConfigProvider, ConfigContext } from './contexts/ConfigContext';

function AppContent() {
  const { config, updateConfig, loading } = useContext(ConfigContext);
  
  const [openChangePassword, setOpenChangePassword] = useState(false);
  
  // State quản lý việc phóng to logo giữa màn hình
  const [openLogoZoom, setOpenLogoZoom] = useState(false);

  // 1. Khởi tạo activeModule từ localStorage, mặc định nếu chưa có thì là 'login' hoặc 'dashboard'
  const [activeModule, setActiveModule] = useState(() => {
    const savedModule = localStorage.getItem('activeModule');
    if (savedModule) return savedModule;
    return config?.loggedIn ? 'dashboard' : 'login';
  });

  // 2. Lưu activeModule vào localStorage mỗi khi nó thay đổi
  useEffect(() => {
    if (activeModule) {
      localStorage.setItem('activeModule', activeModule);
    }
  }, [activeModule]);

  useEffect(() => {
    if (!loading) {
      if (!config?.loggedIn) {
        setActiveModule('login');
        localStorage.setItem('activeModule', 'login');
      } else if (activeModule === 'login') {
        setActiveModule('dashboard');
        localStorage.setItem('activeModule', 'dashboard');
      }
    }
  }, [config?.loggedIn, loading]);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await updateConfig({ loggedIn: false, account: "", accountType: "" });
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");
    localStorage.removeItem("accountType");
    localStorage.removeItem("activeModule"); // Xóa module khi đăng xuất
    setAnchorEl(null);
    setActiveModule('login');
  };

  if (loading) return null;

  // 🌟 KIỂM TRA LOẠI TÀI KHOẢN TỪ ACCOUNT_TYPE HOẶC TÊN ACCOUNT
  const currentAccount = config?.account || localStorage.getItem("account") || "";
  const currentAccountType = config?.accountType || localStorage.getItem("accountType") || "";
  
  // Xác định chính xác tài khoản Thuận Phát
  const isThuậnPhát = currentAccountType === "thuanphat" || currentAccount.toLowerCase().includes("thuận phát");

  return (
    <>
      <AppBar position="fixed" sx={{ background: "#1976d2" }}>
        <Toolbar
          sx={{
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            gap: 1,
            minHeight: "48px !important",
            paddingTop: 0,
            paddingBottom: 0,
            px: { xs: 1, sm: 2 },
          }}
        >
          {/* LEFT: LOGO + DASHBOARD */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* LOGO BẤM VÀO SẼ MỞ POPUP PHÓNG TO */}
            <Box
              component="img"
              src="/logo2.png"
              alt="Logo QUẢN LÝ CÔNG NỢ KH"
              onClick={() => setOpenLogoZoom(true)}
              title="Bấm để xem logo phóng to"
              sx={{
                height: 34,
                width: 34,
                objectFit: "contain",
                flexShrink: 0,
                ml: { xs: 0.5, sm: -1 },
                mr: 1,
                cursor: "pointer",
                borderRadius: "4px",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "scale(1.08)",
                },
              }}
            />          

            <Button
              onClick={() => setActiveModule(config?.loggedIn ? 'dashboard' : 'login')}
              sx={{ color: "#fff", textTransform: "none", fontWeight: 500 }}
            >
              DASHBOARD
            </Button>
          </Box>

          {/* RIGHT: USER AREA */}
          {config?.loggedIn ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
              {currentAccount && (
                <Box component="span" sx={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500, display: { xs: "none", sm: "inline" } }}>
                  {currentAccount}
                </Box>
              )}

              {/* 👤 ICON PHÂN BIỆT TÀI KHOẢN THEO ACCOUNT_TYPE */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: isThuậnPhát ? "#10b981" : "#FFD700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: isThuậnPhát 
                    ? "0 2px 8px rgba(16, 185, 129, 0.4)" 
                    : "0 2px 8px rgba(255, 215, 0, 0.4)",
                }}
              >
                {isThuậnPhát ? (
                  <PersonRoundedIcon sx={{ color: "#fff", fontSize: 18 }} />
                ) : (
                  <AdminPanelSettingsIcon sx={{ color: "#5D4037", fontSize: 20 }} />
                )}
              </Box>

              <IconButton onClick={handleMenuOpen} sx={{ color: "#fff" }}>
                <AppsIcon />
              </IconButton>
            </Box>
          ) : (
            <Button
              onClick={() => setActiveModule('login')}
              sx={{
                color: "#fff",
                ml: "auto",
                textTransform: "none",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { color: "#fff" },
              }}
            >
              <LoginIcon sx={{ fontSize: 20 }} />
              Đăng nhập
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* POPUP PHÓNG TO LOGO GIỮA MÀN HÌNH */}
      <Dialog
        open={openLogoZoom}
        onClose={() => setOpenLogoZoom(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 2,
            position: "relative",
            textAlign: "center",
          },
        }}
      >
        <IconButton
          onClick={() => setOpenLogoZoom(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box
            component="img"
            src="/logo2.png"
            alt="Logo QUẢN LÝ CÔNG NỢ KH"
            sx={{
              width: "100%",
              maxHeight: "65vh",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
        </DialogContent>
      </Dialog>

      {/* MENU HỆ THỐNG */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 180,
            overflow: "hidden",
            boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
            p: 0,
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "#fff",
            fontWeight: 600,
            fontSize: 14,
            borderBottom: "1px solid #eee",
            color: "#d32f2f",
          }}
        >
          HỆ THỐNG
        </Box>

        <Box
          onClick={() => {
            handleMenuClose();
            setOpenChangePassword(true);
          }}
          sx={{
            px: 2,
            py: 1.5,
            cursor: "pointer",
            bgcolor: "#f5f7fa",
            transition: "0.2s",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": { bgcolor: "#e9eef5" },
          }}
        >
          <LockResetIcon sx={{ fontSize: 18, color: "#1976d2" }} />
          Đổi mật khẩu
        </Box>

        <Box sx={{ height: "1px", bgcolor: "#e5e7eb", mx: 1 }} />

        <Box
          onClick={() => {
            handleMenuClose();
            handleLogout();
          }}
          sx={{
            px: 2,
            py: 1.5,
            cursor: "pointer",
            bgcolor: "#f5f7fa",
            transition: "0.2s",
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&:hover": { bgcolor: "#e9eef5" },
          }}
        >
          <LogoutIcon sx={{ fontSize: 18, color: "#d32f2f" }} />
          Đăng xuất
        </Box>
      </Menu>

      {/* NỘI DUNG CÁC MODULE */}
      <Box sx={{ paddingTop: "48px" }}>
        {activeModule === 'login' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <Login onLoginSuccess={(accountName, accountType) => {
              setActiveModule('dashboard');
            }} />
          </div>
        )}

        {activeModule === 'dashboard' && (
          <Dashboard onSelectModule={(moduleId) => setActiveModule(moduleId)} />
        )}

        {activeModule === 'danh-sach-kh' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <DanhSachKhachHang onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'nhap-xuat-kho' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <NhapXuatKho onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'cong-no-kh' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <CongNoKhachHang onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'hoa-don' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <HoaDonBanHang onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'cap-nhat-don-gia' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <CapNhatDonGia onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'danh-muc-vt' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <DanhMucHangHoa onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'bao-cao-thong-ke' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <DoanhSoBanHang onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {(activeModule === 'thanh-toan-cong-no' || activeModule === 'phan-phoi-quy') && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <ThanhToanCongNo onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {activeModule === 'cai-dat' && (
          <div className="min-h-screen bg-[#f4f6f9] w-full p-2 md:p-4">
            <CaiDatHeThong onBack={() => setActiveModule('dashboard')} />
          </div>
        )}

        {![
          'login',
          'dashboard',
          'danh-sach-kh',
          'nhap-xuat-kho',
          'cong-no-kh',
          'hoa-don',
          'cap-nhat-don-gia',
          'danh-muc-vt',
          'bao-cao-thong-ke',
          'thanh-toan-cong-no',
          'phan-phoi-quy',
          'cai-dat',
        ].includes(activeModule) && (
          <div className="min-h-screen bg-[#f4f6f9] p-4 w-full">
            <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <button
                  onClick={() => setActiveModule('dashboard')}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
                </button>
                <h2 className="text-lg font-bold text-slate-800">
                  Chức năng: {activeModule}
                </h2>
              </div>
            </div>
          </div>
        )}
      </Box>

      {/* DIALOG ĐỔI MẬT KHẨU */}
      <ChangePasswordDialog
        open={openChangePassword}
        onClose={() => setOpenChangePassword(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <CongNoProvider>
        <KhoProvider>
          <AppContent />
        </KhoProvider>
      </CongNoProvider>
    </ConfigProvider>
  );
}