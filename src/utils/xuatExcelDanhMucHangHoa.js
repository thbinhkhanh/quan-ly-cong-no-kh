import ExcelJS from 'exceljs';
/**
 * Hàm xuất file Excel Danh Mục Hàng Hóa chuyên nghiệp
 * @param {Array} items - Danh sách mặt hàng (hoặc filteredItems)
 * @param {Function} setSnackbar - Hàm hiển thị thông báo Snackbar
 */
export const xuatExcelDanhMucHangHoa = async ({ items = [], setSnackbar }) => {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!items || items.length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Không có dữ liệu danh mục hàng hóa để xuất Excel!',
        severity: 'warning',
      });
    }
    return;
  }

  // 2. Khởi tạo Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DanhMucHangHoa');

  // Bật hiển thị đường lưới gridlines
  worksheet.views = [{ showGridLines: true }];

  // 3. Thông tin tiêu đề cửa hàng THUẬN PHÁT (Đã cập nhật TP.HCM)
  const storeNameRow = worksheet.addRow(['CỬA HÀNG: THUẬN PHÁT']);
  storeNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Địa chỉ: 140 Đường Rừng Sác, Bình Khánh, TP.HCM']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  const phoneRow = worksheet.addRow(['Điện thoại: 0938702119 - 0982742119 - 0943242119']);
  phoneRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow([]); // Dòng trống

  // 4. Tiêu đề Bảng báo cáo chính (Gộp từ A5 đến D5)
  const titleRow = worksheet.addRow(['DANH MỤC HÀNG HÓA']);
  worksheet.mergeCells('A5:D5');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 16, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  worksheet.addRow([]); // Dòng trống

  // 5. Khởi tạo Header Bảng (4 cột)
  const headers = ['STT', 'TÊN HÀNG', 'CÔNG TY', 'ĐVT'];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;

  for (let col = 1; col <= 4; col++) {
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

  // 6. Thêm dữ liệu từng dòng & đóng khung 100% tất cả các ô
  items.forEach((item, index) => {
    const row = worksheet.addRow([
      item.stt || index + 1,
      item.name || '',
      item.company || '—',
      item.unit || '—'
    ]);

    row.height = 20;

    for (let col = 1; col <= 4; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;

      if (col === 1) { // STT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 2) { // Tên hàng
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { bold: true, color: { argb: '0F172A' } };
      } else if (col === 3) { // Công ty
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (col === 4) { // ĐVT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
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

  // Cố định kích thước chuẩn cho các cột nhỏ
  worksheet.getColumn(1).width = 8;  // STT
  worksheet.getColumn(4).width = 12; // ĐVT

  // 8. Tạo tập tin và kích hoạt tải về
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Danh_Muc_Hang_Hoa_${dateStr}.xlsx`;

  a.click();
  window.URL.revokeObjectURL(url);

  // Thông báo Snackbar
  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất danh mục hàng hóa ra Excel thành công!',
      severity: 'success',
    });
  }
};