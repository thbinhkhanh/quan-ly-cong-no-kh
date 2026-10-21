import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button
} from '@mui/material';

export default function XacNhanXoaDialog({ open, onClose, onConfirm, item }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          Xác nhận xóa giao dịch
        </Typography>

        {/* Nội dung chi tiết bao gồm Ngày giao dịch */}
        <Typography sx={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5, mb: 1 }}>
          Bạn có chắc chắn muốn xóa giao dịch mặt hàng <Box component="span" sx={{ fontWeight: 700, color: "#0f172a" }}>{item?.itemName || '—'}</Box> của khách hàng <Box component="span" sx={{ fontWeight: 700, color: "#1e3a8a" }}>{item?.customer || '—'}</Box> vào ngày <Box component="span" sx={{ fontWeight: 700, color: "#0288d1" }}>{item?.date || '—'}</Box> không?
        </Typography>

        <Typography sx={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>
          Hành động này không thể hoàn tác.
        </Typography>
      </DialogContent>

      {/* Khu vực nút bấm hành động */}
      <Box sx={{ p: 3, pt: 1, display: "flex", gap: 1.5, justifyContent: "center" }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onClose}
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
          onClick={onConfirm}
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
          Xác nhận xóa
        </Button>
      </Box>
    </Dialog>
  );
}