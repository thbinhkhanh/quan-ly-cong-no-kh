import ExcelJS from 'exceljs';

/**
 * Hàm xuất file Excel Danh sách Khách hàng chuyên nghiệp
 * @param {Array} customers - Danh sách khách hàng (hoặc filteredCustomers)
 * @param {Function} setSnackbar - Hàm cập nhật Snackbar thông báo
 */
export const xuatExcelDanhSachKhachHang = async ({ customers = [], setSnackbar }) => {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!customers || customers.length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Chưa có dữ liệu khách hàng để xuất file!',
        severity: 'warning',
      });
    }
    return;
  }

  // 2. Khởi tạo Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DanhSachKhachHang');

  // Bật hiển thị đường lưới gridlines
  worksheet.views = [{ showGridLines: true }];

  // 3. Thông tin tiêu đề cửa hàng THUẬN PHÁT
  const storeNameRow = worksheet.addRow(['CỬA HÀNG: THUẬN PHÁT']);
  storeNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Địa chỉ: 140 Đường Rừng Sác, Bình Khánh, TP.HCM']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  const phoneRow = worksheet.addRow(['Điện thoại: 0938702119 - 0982742119 - 0943242119']);
  phoneRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow([]); // Dòng trống

  // 4. Tiêu đề Bảng báo cáo chính (Gộp từ A5 đến D5)
  const titleRow = worksheet.addRow(['DANH SÁCH KHÁCH HÀNG']);
  worksheet.mergeCells('A5:D5');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 16, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  worksheet.addRow([]); // Dòng trống

  // 5. Khởi tạo Header Bảng (4 cột)
  const headers = ['STT', 'TÊN KHÁCH HÀNG', 'SỐ ĐIỆN THOẠI', 'ĐỊA CHỈ'];
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
  customers.forEach((item, index) => {
    const row = worksheet.addRow([
      item.stt || index + 1,
      item.name || '',
      item.phone || '—',
      item.address || '—'
    ]);

    row.height = 20;

    for (let col = 1; col <= 4; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;

      if (col === 1) { // STT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 2) { // Tên khách hàng
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { bold: true, color: { argb: '0F172A' } };
      } else if (col === 3) { // Số điện thoại
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { color: { argb: '2563EB' } };
      } else if (col === 4) { // Địa chỉ
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
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

  // Độ rộng mặc định chuẩn cho các cột
  worksheet.getColumn(1).width = 8;  // STT
  worksheet.getColumn(2).width = 30; // Tên khách hàng
  worksheet.getColumn(3).width = 18; // SĐT
  worksheet.getColumn(4).width = 35; // Địa chỉ

  // 8. Tạo tập tin và kích hoạt tải về
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Danh_Sach_Khach_Hang_${dateStr}.xlsx`;

  a.click();
  window.URL.revokeObjectURL(url);

  // Thông báo Snackbar
  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất danh sách khách hàng ra Excel thành công!',
      severity: 'success',
    });
  }
};