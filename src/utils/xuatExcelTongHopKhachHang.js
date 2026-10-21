import ExcelJS from 'exceljs';

/**
 * Hàm xuất file Excel Tổng hợp Công nợ Khách hàng chuyên nghiệp
 * @param {Array} displayData - Danh sách khách hàng đã lọc/sắp xếp
 * @param {Object} totals - Tổng hợp (totalAmount, totalPaid, totalDebt)
 * @param {Function} setSnackbar - Hàm thông báo (nếu có)
 */
export const xuatExcelTongHopKhachHang = async ({
  displayData = [],
  totals = { totalAmount: 0, totalPaid: 0, totalDebt: 0 },
  setSnackbar
}) => {
  if (!displayData || displayData.length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Không có dữ liệu khách hàng để xuất Excel!',
        severity: 'warning',
      });
    }
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TongHopCongNoKhachHang');

  // Hiển thị đường lưới gridlines
  worksheet.views = [{ showGridLines: true }];

  // 1. Thông tin cửa hàng THUẬN PHÁT
  const storeNameRow = worksheet.addRow(['CỬA HÀNG: THUẬN PHÁT']);
  storeNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Địa chỉ: 140 Đường Rừng Sác, Bình Khánh, TP.HCM']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  const phoneRow = worksheet.addRow(['Điện thoại: 0938702119 - 0982742119 - 0943242119']);
  phoneRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow([]); // Dòng trống

  // 2. Tiêu đề Bảng báo cáo (Gộp từ A5 đến E5)
  const titleRow = worksheet.addRow(['BẢNG TỔNG HỢP CÔNG NỢ KHÁCH HÀNG']);
  worksheet.mergeCells('A5:E5');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 16, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  worksheet.addRow([]); // Dòng trống

  // 3. Khởi tạo Header Bảng (5 cột)
  const headers = ['STT', 'KHÁCH HÀNG', 'TỔNG MUA', 'ĐÃ TRẢ', 'DƯ NỢ'];
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

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  // 4. Thêm dữ liệu từng dòng
  displayData.forEach((item, index) => {
    const amount = Number(item.amountNum) || 0;
    const paid = Number(item.paidNum) || 0;
    const debt = Number(item.debtNum) || 0;

    const row = worksheet.addRow([
      index + 1,
      item.name || '',
      amount,
      paid,
      debt
    ]);

    row.height = 20;

    for (let col = 1; col <= 5; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;

      if (col === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (col === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0'; // Định dạng tiền tệ VNĐ
      }
    }
  });

  // 5. Dòng Tổng cộng hệ thống
  const totalRow = worksheet.addRow([
    '', 'TỔNG CỘNG HỆ THỐNG', 
    Number(totals.totalAmount) || 0, 
    Number(totals.totalPaid) || 0, 
    Number(totals.totalDebt) || 0
  ]);
  totalRow.height = 25;

  const totalBorder = {
    top: { style: 'medium', color: { argb: 'D97706' } },
    bottom: { style: 'double', color: { argb: 'D97706' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  for (let col = 1; col <= 5; col++) {
    const cell = totalRow.getCell(col);
    cell.font = { bold: true, size: 11, color: { argb: '0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FEF3C7' }, // Nền vàng nhạt nổi bật
    };
    cell.border = totalBorder;

    if (col === 1) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (col === 2) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    }
  }

  // 6. Tự động chỉnh độ rộng cột
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.row !== 5 && cell.value) {
        const strVal = cell.value.toString();
        if (strVal.length > maxLen) maxLen = strVal.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  worksheet.getColumn(1).width = 8;  // STT
  worksheet.getColumn(2).width = 35; // Khách hàng

  // 7. Xuất file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `Tong_Hop_Cong_No_Khach_Hang_${dateStr}.xlsx`;

  a.click();
  window.URL.revokeObjectURL(url);

  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất tổng hợp công nợ ra Excel thành công!',
      severity: 'success',
    });
  }
};