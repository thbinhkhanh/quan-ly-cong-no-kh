import ExcelJS from 'exceljs';

/**
 * Hàm xuất file Excel Bảng Đơn Giá Sản Phẩm chuyên nghiệp
 * @param {Array} items - Danh sách mặt hàng (hoặc filteredItems)
 * @param {Function} setSnackbar - Hàm hiển thị thông báo Snackbar
 */
export const xuatExcelDonGia = async ({ items = [], setSnackbar }) => {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!items || items.length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Không có dữ liệu đơn giá để xuất Excel!',
        severity: 'warning',
      });
    }
    return;
  }

  // 2. Khởi tạo Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BangDonGia');

  // Bật hiển thị đường lưới gridlines
  worksheet.views = [{ showGridLines: true }];

  // 3. Thông tin cửa hàng THUẬN PHÁT
  const storeNameRow = worksheet.addRow(['CỬA HÀNG: THUẬN PHÁT']);
  storeNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Địa chỉ: 140 Đường Rừng Sác, Bình Khánh, TP.HCM']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  const phoneRow = worksheet.addRow(['Điện thoại: 0938702119 - 0982742119 - 0943242119']);
  phoneRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow([]); // Dòng trống

  // 4. Tiêu đề Bảng báo giá (Gộp từ A5 đến E5)
  const titleRow = worksheet.addRow(['BẢNG CẬP NHẬT ĐƠN GIÁ SẢN PHẨM']);
  worksheet.mergeCells('A5:E5');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 16, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  worksheet.addRow([]); // Dòng trống

  // 5. Khởi tạo Header Bảng (5 cột)
  const headers = ['STT', 'TÊN HÀNG', 'CÔNG TY', 'ĐVT', 'ĐƠN GIÁ (VNĐ)'];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;

  for (let col = 1; col <= 5; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E40AF' }, // Xanh dương đậm
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: '1E3A8A' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '1E3A8A' } },
      right: { style: 'thin', color: { argb: '94A3B8' } },
    };
  }

  // Kiểu đường viền mảnh chuẩn cho từng ô
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  // 6. Thêm dữ liệu từng dòng & đóng khung 100% các ô
  items.forEach((item, index) => {
    const priceNum = Number(item.price) || 0;

    const row = worksheet.addRow([
      item.stt || index + 1,
      item.name || '',
      item.company || '—',
      item.unit || '—',
      priceNum
    ]);

    row.height = 20;

    for (let col = 1; col <= 5; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;

      if (col === 1) { // STT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 2 || col === 3) { // Tên hàng, Công ty
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col === 4) { // ĐVT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 5) { // Đơn giá
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0'; // Định dạng tiền tệ VNĐ
        cell.font = { bold: true, color: { argb: '15803D' } }; // Chữ xanh lục đậm nổi bật
      }
    }
  });

  // 7. Tự động điều chỉnh độ rộng cột
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.row !== 5 && cell.value) {
        const strVal = cell.value.toString();
        if (strVal.length > maxLen) maxLen = strVal.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 45);
  });

  // Độ rộng cố định cho cột nhỏ
  worksheet.getColumn(1).width = 8;  // STT
  worksheet.getColumn(4).width = 10; // ĐVT
  worksheet.getColumn(5).width = 18; // Đơn giá

  // 8. Tạo tập tin và kích hoạt tải về
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Bang_Cap_Nhat_Don_Gia_${dateStr}.xlsx`;

  a.click();
  window.URL.revokeObjectURL(url);

  // Thông báo Snackbar
  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất bảng đơn giá ra tệp Excel thành công!',
      severity: 'success',
    });
  }
};