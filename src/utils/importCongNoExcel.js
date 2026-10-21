import ExcelJS from 'exceljs';
import { luuCongNo } from './luuCongNo';

// Định dạng ngày từ ExcelJS về dạng DD/MM/YYYY (Đã sửa lỗi tự ý biến chuỗi chữ thành ngày)
export const formatExcelDate = (val) => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return `${val.getDate()}/${val.getMonth() + 1}/${val.getFullYear()}`;
  }
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // CHỈ chấp nhận định dạng ngày chuẩn dạng dd/mm/yyyy hoặc yyyy-mm-dd
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // Tuyệt đối không dùng new Date(trimmed) ở đây để tránh lỗi nhận diện nhầm "PERFORM 3" thành ngày tháng
    return trimmed;
  }
  return String(val);
};

// Hàm lấy giá trị tổng quát (dùng cho ngày, số tiền, v.v.)
export const getCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (cell.value instanceof Date) return formatExcelDate(cell.value);
  if (typeof cell.value === 'object') {
    if (cell.value.result !== undefined) return formatExcelDate(cell.value.result);
    if (cell.value.text !== undefined) return cell.value.text;
    if (cell.value.richText !== undefined) {
      return cell.value.richText.map((t) => t.text).join('');
    }
    return '';
  }
  return formatExcelDate(cell.value);
};

// Hàm chuyên dụng để đọc chuỗi văn bản (Tên hàng, Khách hàng, Đơn vị, Ghi chú) tránh bị ép kiểu nhầm
export const getTextCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    if (cell.value.text !== undefined) return String(cell.value.text);
    if (cell.value.result !== undefined) return String(cell.value.result);
    if (cell.value.richText !== undefined) {
      return cell.value.richText.map((t) => t.text).join('');
    }
    if (cell.value instanceof Date) {
      // Nếu ô đó thực sự lưu là Date của Excel thì mới format ngày, còn không trả về rỗng hoặc string
      return formatExcelDate(cell.value);
    }
    return '';
  }
  return String(cell.value).trim();
};

export const parseNumericCell = (cell) => {
  const val = getCellValue(cell);
  if (val === '' || val === '-' || val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

/**
 * Đọc file Excel Bảng công nợ khách hàng, chuyển đổi thành mảng dữ liệu 
 * và tự động gọi hàm luuCongNo để ghi vào collection "CONGNO" trên Firestore
 * @param {File} file 
 * @returns {Promise<Array>} Mảng dữ liệu giao dịch công nợ
 */
export const importCongNoExcel = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  const parsedData = [];

  worksheet.eachRow((row) => {
    // Dùng getCellValue cho cột ngày (cột 2) vì ngày cần parse từ số/date object của Excel
    const rawCol1 = getCellValue(row.getCell(1));
    const rawCol2 = getCellValue(row.getCell(2));
    
    // Dùng getTextCellValue cho cột Khách hàng (cột 3) và Tên hàng (cột 4) để bảo vệ tuyệt đối chuỗi chữ
    const col1 = String(rawCol1 || '').trim();
    const col2 = String(rawCol2 || '').trim();
    const customer = getTextCellValue(row.getCell(3));
    const col4 = getTextCellValue(row.getCell(4));

    const rowText = `${col1} ${col2} ${customer} ${col4}`.toUpperCase();

    if (
      rowText.includes("CỬA HÀNG") ||
      rowText.includes("ĐỊA CHỈ") ||
      rowText.includes("ĐIỆN THOẠI") ||
      rowText.includes("BẢNG CÔNG NỢ") ||
      rowText.includes("TÊN KHÁCH HÀNG") ||
      (col1.toUpperCase() === "STT" && col2.toUpperCase() === "NGÀY") ||
      (!col4 && !customer)
    ) {
      return;
    }

    const date = col2;
    const itemName = col4 || (parseNumericCell(row.getCell(9)) > 0 ? 'TRẢ TIỀN' : '');
    const unit = String(getTextCellValue(row.getCell(5)) || '').trim();
    const qty = parseNumericCell(row.getCell(6));
    const price = parseNumericCell(row.getCell(7));
    const amount = parseNumericCell(row.getCell(8)) || (qty * price);
    const paid = parseNumericCell(row.getCell(9));
    const debt = parseNumericCell(row.getCell(10));
    const note = String(getTextCellValue(row.getCell(11)) || '').trim();

    // CHẤP NHẬN DÒNG NẾU CÓ NGÀY VÀ (CÓ TÊN HÀNG HOẶC CÓ TIỀN THANH TOÁN)
    if (date && (itemName || paid > 0)) {
      let timestamp = Date.now();
      const parts = date.split('/');
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) timestamp = d.getTime();
      }

      parsedData.push({
        date: date,
        timestamp: timestamp,
        customer: customer,
        itemName: itemName || 'TRẢ TIỀN',
        unit: unit,
        qty: qty,
        price: price,
        amount: amount,
        paid: paid,
        debt: debt,
        note: note,
      });
    }
  });

  // Tự động gọi hàm luuCongNo để đồng bộ dữ liệu vào Firestore collection "CONGNO"
  if (parsedData.length > 0) {
    console.log(`[Excel] Đã đọc xong ${parsedData.length} dòng. Đang tiến hành lưu vào Firestore qua luuCongNo...`);
    await luuCongNo(parsedData);
  }

  return parsedData;
};