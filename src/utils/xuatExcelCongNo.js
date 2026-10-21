import ExcelJS from 'exceljs';

/**
 * Hàm xuất file Excel Công nợ Khách hàng chuyên nghiệp
 * @param {Array} filteredItems - Danh sách dòng dữ liệu công nợ
 * @param {String} selectedCustomer - Tên khách hàng chọn lọc (hoặc 'ALL')
 * @param {Number} totalAmount - Tổng thành tiền
 * @param {Number} totalPaid - Tổng thanh toán
 * @param {Number} lastDebt - Tổng nợ còn lại
 * @param {Function} setSnackbar - Hàm cập nhật Snackbar thông báo
 */
export const xuatExcelCongNo = async ({
  filteredItems = [],
  selectedCustomer = 'ALL',
  totalAmount = 0,
  totalPaid = 0,
  lastDebt = 0,
  setSnackbar
}) => {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!filteredItems || filteredItems.length === 0) {
    if (setSnackbar) {
      setSnackbar({
        open: true,
        message: 'Không có dữ liệu để xuất Excel!',
        severity: 'warning',
      });
    }
    return;
  }

  // 2. Khởi tạo Workbook & Worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CongNoKhachHang');

  // Đảm bảo bật hiển thị đường lưới gridlines
  worksheet.views = [{ showGridLines: true }];

  // 3. Thông tin tiêu đề cửa hàng
  const storeNameRow = worksheet.addRow(['CỬA HÀNG: THUẬN PHÁT']);
  storeNameRow.getCell(1).font = { bold: true, size: 12, color: { argb: '1E3A8A' } };

  const addressRow = worksheet.addRow(['Địa chỉ: 140 Đường Rừng Sác, Bình Khánh, TP.HCM']);
  addressRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  const phoneRow = worksheet.addRow(['Điện thoại: 0938702119 - 0982742119 - 0943242119']);
  phoneRow.getCell(1).font = { italic: true, size: 10, color: { argb: '4B5563' } };

  worksheet.addRow([]); // Dòng trống

  // 4. Tiêu đề Bảng báo cáo chính (Gộp ô căn giữa)
  const titleRow = worksheet.addRow(['BẢNG CÔNG NỢ KHÁCH HÀNG']);
  worksheet.mergeCells('A5:K5');
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 16, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 30;

  // Tên khách hàng & Ngày xuất báo cáo
  const custText = selectedCustomer === 'ALL' ? 'Tất cả khách hàng' : selectedCustomer;
  const customerRow = worksheet.addRow([`Khách hàng: ${custText}`]);
  customerRow.getCell(1).font = { bold: true, size: 11, color: { argb: '1E293B' } };

  worksheet.addRow([]); // Dòng trống

  // 5. Khởi tạo Header Bảng
  const headers = [
    'STT', 'Ngày', 'Khách hàng', 'Tên hàng', 'ĐVT', 
    'SLg', 'Đơn giá', 'Thành tiền', 'Thanh toán', 'Còn lại', 'Ghi chú'
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;

  // Style cho Header Row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E40AF' }, // Màu xanh dương sẫm chuyên nghiệp
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      left: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '1E3A8A' } },
      right: { style: 'thin', color: { argb: '94A3B8' } },
    };
  });

  // 6. Thêm dữ liệu từng dòng
  filteredItems.forEach((item, index) => {
    const row = worksheet.addRow([
      item.stt || index + 1,
      item.date || '',
      item.customer || '',
      item.itemName || '',
      item.unit || '',
      Number(item.qty) || 0,
      Number(item.price) || 0,
      Number(item.amountNum) || 0,
      Number(item.paidNum) || 0,
      Number(item.debt) || 0,
      item.note || ''
    ]);

    row.height = 20;

    // Kẻ khung & căn chỉnh dữ liệu từng ô
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      // Căn chỉnh vị trí & định dạng số
      if (colNumber === 1) { // STT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 2 || colNumber === 5) { // Ngày, ĐVT
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 6) { // Số lượng
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.##';
      } else if ([7, 8, 9, 10].includes(colNumber)) { // Đơn giá, Thành tiền, Thanh toán, Còn lại
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0'; // Định dạng chuẩn tiền tệ VNĐ
      } else { // Tên KH, Tên hàng, Ghi chú
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // 7. Dòng Tổng cộng cuối bảng
  const totalRow = worksheet.addRow([
    '', '', '', '', '', '', 'TỔNG CỘNG:', 
    Number(totalAmount) || 0, 
    Number(totalPaid) || 0, 
    Number(lastDebt) || 0, 
    ''
  ]);
  totalRow.height = 24;

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: '0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FEF3C7' }, // Tô nền vàng nhạt nổi bật
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'D97706' } },
      bottom: { style: 'double', color: { argb: 'D97706' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };

    if (colNumber === 7) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if ([8, 9, 10].includes(colNumber)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    }
  });

  // 8. Tự động tính toán độ rộng các cột (Auto Column Width)
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      // Bỏ qua dòng tiêu đề đã merge để không làm lệch độ rộng
      if (cell.row !== 5 && cell.value) {
        const strVal = cell.value.toString();
        if (strVal.length > maxLen) maxLen = strVal.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  // Cố định độ rộng 1 số cột nhỏ
  worksheet.getColumn(1).width = 8;  // STT
  worksheet.getColumn(2).width = 14; // Ngày
  worksheet.getColumn(5).width = 10; // ĐVT

  // 9. Ghi file và tải về
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Đặt tên file sạch sẽ, định dạng ngày tháng an toàn
  const cleanCustomerName = String(selectedCustomer).replace(/[^a-zA-Z0-9_àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳỵỷỹ]+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `CongNo_${cleanCustomerName}_${dateStr}.xlsx`;

  a.click();
  window.URL.revokeObjectURL(url);

  // Thông báo thành công
  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: 'Đã xuất tệp Excel công nợ thành công!',
      severity: 'success',
    });
  }
};