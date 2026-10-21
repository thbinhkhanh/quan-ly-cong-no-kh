import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { ConfigContext } from "../contexts/ConfigContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ACCOUNTS = ["Thuận Phát", "Admin"];

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState(ACCOUNTS[0]);
  const [password, setPassword] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const { updateConfig } = useContext(ConfigContext);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (updateConfig) {
            updateConfig({
              tuan: data.tuan || 1,
              mon: data.mon || "Tin học",
              lop: data.lop || "",
              th_tuan_from: data.th_tuan_from,
              th_tuan_to: data.th_tuan_to,
            });
          }
        }
      } catch (err) {
        console.error("Lỗi tải CONFIG/config:", err);
      }
    };

    fetchConfig();
  }, [updateConfig]);

  const handleLogin = async () => {
    try {
      const docId = username === "Thuận Phát" ? "thuanphat" : "admin";
      const docRef = doc(db, "MATKHAU", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setSnackbar({
          open: true,
          message: `❌ Không tìm thấy thông tin tài khoản ${username} trên hệ thống!`,
          severity: "error",
        });
        return;
      }

      const storedPassword = docSnap.data().pass;

      if (password === storedPassword) {
        // 🌟 TẠO BIẾN LOẠI TÀI KHOẢN (ACCOUNT TYPE)
        const accountType = username === "Thuận Phát" ? "thuanphat" : "admin";

        // Cập nhật ngay vào Context, LocalStorage & Firestore
        if (updateConfig) {
          await updateConfig({
            loggedIn: true,
            account: username,
            accountType: accountType, // 🌟 Lưu loại tài khoản
          });
        }

        setSnackbar({
          open: true,
          message: "✅ Đăng nhập thành công!",
          severity: "success",
        });

        if (onLoginSuccess) {
          onLoginSuccess(username, accountType);
        }
      } else {
        setSnackbar({
          open: true,
          message: "❌ Sai mật khẩu!",
          severity: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi đăng nhập!",
        severity: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#f1f5f9",
        py: 5,
        px: 2,
        display: "flex",
        justifyContent: "center",
        fontFamily: '"Roboto","Inter","Arial",sans-serif',
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: "14px",
            overflow: "hidden",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 35px rgba(0,0,0,0.12)",
            position: "relative",
          }}
        >
          {/* HEADER */}
          <Box sx={{ px: 3, py: 2, background: "#1976d2", color: "#fff", textAlign: "left" }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
              Đăng nhập hệ thống
            </Typography>
          </Box>

          {/* CONTENT */}
          <Box sx={{ px: 3, py: 4 }}>
            <Stack spacing={2.5} alignItems="center">
              <Box
                sx={{
                  width: 82,
                  height: 82,
                  borderRadius: "50%",
                  bgcolor: "#e3f2fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  border: "4px solid #fff",
                  boxShadow: "0 4px 15px rgba(25,118,210,0.15)",
                  alignSelf: "center",
                  paddingLeft: "4px",
                }}
              >
                🔐
              </Box>

              <Box textAlign="center">
                <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
                  Chào mừng
                </Typography>
                <Typography sx={{ fontSize: 14, color: "#64748b", mt: 0.5 }}>
                  Vui lòng chọn tài khoản và nhập mật khẩu
                </Typography>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Tài khoản</InputLabel>
                <Select
                  value={username}
                  label="Tài khoản"
                  onChange={(e) => setUsername(e.target.value)}
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: "5px",
                    textAlign: "left",
                    "& .MuiSelect-select": { textAlign: "left" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dbe2ea" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1976d2",
                      borderWidth: 2,
                    },
                  }}
                >
                  {ACCOUNTS.map((acc) => (
                    <MenuItem key={acc} value={acc} sx={{ justifyContent: "flex-start", textAlign: "left" }}>
                      {acc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#fff",
                    borderRadius: "5px",
                    "& fieldset": { borderColor: "#dbe2ea" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#1976d2",
                      borderWidth: 2,
                    },
                  },
                }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleLogin}
                sx={{
                  textTransform: "none",
                  borderRadius: "12px",
                  py: 1.2,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                🔐 Đăng nhập
              </Button>
            </Stack>
          </Box>
        </Card>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}