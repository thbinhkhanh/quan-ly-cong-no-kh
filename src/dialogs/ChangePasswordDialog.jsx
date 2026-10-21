import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
  Fade,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ChangePasswordDialog = ({ open, onClose }) => {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const resetState = () => {
    setNewPw("");
    setConfirmPw("");
    setPwError("");
    setSaving(false);
    setSuccess(false);
    setShowPw(false);
    setShowConfirmPw(false);
  };

  const handleClose = () => {
    if (saving) return;
    resetState();
    onClose();
  };

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw) {
      setPwError("Vui lòng nhập đầy đủ thông tin mật khẩu.");
      return;
    }

    if (newPw !== confirmPw) {
      setPwError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSaving(true);
      setPwError("");

      const currentAccount = localStorage.getItem("account") || "";
      const docId = currentAccount.toLowerCase() === "thuận phát" ? "thuanphat" : "admin";

      await setDoc(
        doc(db, "MATKHAU", docId),
        { pass: newPw },
        { merge: true }
      );

      setSuccess(true);
      setSnackbar({
        open: true,
        message: "Đổi mật khẩu thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi lưu mật khẩu:", err);
      setSnackbar({
        open: true,
        message: "Có lỗi xảy ra khi cập nhật mật khẩu.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        TransitionComponent={Fade}
        onClose={(event, reason) => {
          if (saving) return;
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          handleClose();
        }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            background: "#ffffff",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            p: 0,
          },
        }}
      >
        {/* HEADER HIỆN ĐẠI */}
        <Box
          sx={{
            pt: 4,
            pb: 3,
            px: 3,
            background: "linear-gradient(135deg, #f0f7ff 0%, #e1effe 100%)",
            textAlign: "center",
            position: "relative",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <IconButton
            onClick={handleClose}
            disabled={saving}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: "#64748b",
              bgcolor: "rgba(255, 255, 255, 0.6)",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.9)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "#1976d2",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
              boxShadow: "0 8px 16px rgba(25, 118, 210, 0.25)",
            }}
          >
            {success ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 30 }} />
            ) : (
              <LockResetRoundedIcon sx={{ fontSize: 28 }} />
            )}
          </Box>

          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
            {success ? "Hoàn tất!" : "Đổi mật khẩu"}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: "#64748b" }}>
            {success ? "Mật khẩu hệ thống đã được thay đổi an toàn." : "Vui lòng nhập mật khẩu mới cho tài khoản của bạn."}
          </Typography>
        </Box>

        {/* CONTENT */}
        <DialogContent sx={{ px: 3, py: 3.5, bgcolor: "#ffffff" }}>
          <Stack spacing={2.5}>
            {!success ? (
              <>
                <TextField
                  label="Mật khẩu mới"
                  type={showPw ? "text" : "password"}
                  fullWidth
                  size="medium"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      "&:hover fieldset": { borderColor: "#94a3b8" },
                      "&.Mui-focused fieldset": { borderColor: "#1976d2", borderWidth: "2px" },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" onClick={() => setShowPw(!showPw)}>
                          {showPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Xác nhận mật khẩu"
                  type={showConfirmPw ? "text" : "password"}
                  fullWidth
                  size="medium"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      "&:hover fieldset": { borderColor: "#94a3b8" },
                      "&.Mui-focused fieldset": { borderColor: "#1976d2", borderWidth: "2px" },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                          {showConfirmPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {pwError && (
                  <Typography
                    sx={{
                      color: "#ef4444",
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "center",
                      bgcolor: "#fef2f2",
                      py: 1,
                      px: 2,
                      borderRadius: "8px",
                      border: "1px solid #fee2e2",
                    }}
                  >
                    {pwError}
                  </Typography>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Typography sx={{ color: "#059669", fontSize: 15, fontWeight: 600 }}>
                  Cập nhật thông tin thành công!
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>

        {/* ACTIONS: CĂN GIỮA TUYỆT ĐỐI 2 NÚT */}
        <Box sx={{ px: 3, pb: 4, pt: 1, display: "flex", justifyContent: "center", bgcolor: "#ffffff" }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ width: "100%", maxWidth: 320 }}
          >
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={saving}
              sx={{
                flex: 1,
                height: 46,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: "#475569",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
              }}
            >
              {success ? "Đóng" : "Hủy"}
            </Button>

            {!success && (
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={saving}
                sx={{
                  flex: 1,
                  height: 46,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#1976d2",
                  boxShadow: "0 10px 20px rgba(25, 118, 210, 0.3)",
                  "&:hover": { bgcolor: "#115293" },
                }}
              >
                {saving ? "Đang lưu..." : "Xác nhận"}
              </Button>
            )}
          </Stack>
        </Box>
      </Dialog>

      {/* SNACKBAR THÔNG BÁO */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: "10px" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ChangePasswordDialog;