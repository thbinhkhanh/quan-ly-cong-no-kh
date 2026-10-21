export const printNhapXuatKho = ({
  filteredItems = [],
  totals = { totalImport: 0, totalExport: 0, totalStock: 0 },
  searchTerm = ""
}) => {
  if (!filteredItems || filteredItems.length === 0) {
    alert("❌ Không có dữ liệu nhập xuất kho để in!");
    return;
  }

  const formatMoney = (val) => {
    if (val === '-' || val === '' || val === null || val === undefined) return '-';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '-';
    return num.toLocaleString('vi-VN');
  };

  const formatStock = (val) => {
    if (val === '-' || val === '' || val === null || val === undefined) return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    if (num < 0) {
      return `(${Math.abs(num).toLocaleString('vi-VN')})`;
    }
    return num.toLocaleString('vi-VN');
  };

  const currentDate = new Date().toLocaleDateString('vi-VN');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Bảng Nhập Xuất Tồn Kho - Cửa hàng Thuận Phát</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: "Times New Roman", serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
        
        .store-header { text-align: left; font-weight: bold; font-size: 13px; line-height: 1.4; color: #1e3a8a; }
        .report-title { text-align: center; color: #1e3a8a; font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 10px 0 5px 0; letter-spacing: 0.5px; }
        .report-subtitle { text-align: center; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 10px; }
        .print-date { text-align: right; font-size: 11px; font-style: italic; margin-bottom: 8px; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5px; }
        th, td { border: 1px solid #000; padding: 4px 5px; line-height: 1.2; word-wrap: break-word; white-space: normal; vertical-align: middle; font-size: 11px; }
        th { background-color: #c7e8f8 !important; color: #0000ff !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        th:nth-child(1), td:nth-child(1) { text-align: center; width: 4%; }   /* STT */
        th:nth-child(2), td:nth-child(2) { text-align: left; width: 18%; }    /* Tên hàng */
        th:nth-child(3), td:nth-child(3) { text-align: left; width: 12%; }    /* Công ty */
        th:nth-child(4), td:nth-child(4) { text-align: center; width: 6%; }   /* ĐVT */
        th:nth-child(5), td:nth-child(5) { text-align: right; width: 8%; }    /* Đơn giá */
        th:nth-child(6), td:nth-child(6) { text-align: center; width: 7%; }   /* SL Nhập */
        th:nth-child(7), td:nth-child(7) { text-align: center; width: 6%; }   /* K.Mãi */
        th:nth-child(8), td:nth-child(8) { text-align: center; width: 7%; }   /* SL Xuất */
        th:nth-child(9), td:nth-child(9) { text-align: center; width: 7%; }   /* SL Tồn */
        th:nth-child(10), td:nth-child(10) { text-align: center; width: 8%; } /* Trọng lượng */
        th:nth-child(11), td:nth-child(11) { text-align: left; width: 9%; }   /* Thức ăn */
        th:nth-child(12), td:nth-child(12) { text-align: left; width: 8%; }   /* Thuốc */

        .summary-box { margin-top: 15px; font-size: 12px; font-weight: bold; display: flex; justify-content: flex-end; gap: 25px; }
        .summary-box div span { color: #1e3a8a; }
        
        .footer-sign { margin-top: 30px; display: flex; justify-content: flex-end; text-align: center; font-weight: bold; }
        .sign-box { width: 250px; }
      </style>
    </head>
    <body>
      <div class="store-header">
        CỬA HÀNG THUẬN PHÁT<br/>
        ĐC: 140 Đường Rừng Sác, Bình Khánh, TP.HCM<br/>
        ĐT: 0938.702.119
      </div>

      <div class="report-title">BẢNG NHẬP - XUẤT - TỒN KHO</div>
      ${searchTerm ? `<div class="report-subtitle">Từ khóa tìm kiếm: "${searchTerm}"</div>` : ''}
      <div class="print-date">Ngày lập báo cáo: ${currentDate}</div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên hàng</th>
            <th>Công ty</th>
            <th>ĐVT</th>
            <th>Đơn giá</th>
            <th>SL Nhập</th>
            <th>K.Mãi</th>
            <th>SL Xuất</th>
            <th>SL Tồn</th>
            <th>Trọng lượng</th>
            <th>Thức ăn</th>
            <th>Thuốc</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map((item, index) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${item.stt || index + 1}</td>
              <td style="font-weight: bold;">${item.name || ''}</td>
              <td>${item.company || '—'}</td>
              <td style="text-align: center;">${item.unit || '—'}</td>
              <td style="text-align: right;">${formatMoney(item.price)}</td>
              <td style="text-align: center; font-weight: bold; color: #2563eb;">${formatMoney(item.qtyImport)}</td>
              <td style="text-align: center; color: #16a34a;">${formatMoney(item.km)}</td>
              <td style="text-align: center; font-weight: bold; color: #d97706;">${formatMoney(item.qtyExport)}</td>
              <td style="text-align: center; font-weight: bold; color: ${Number(item.qtyStock) < 0 ? '#e11d48' : '#059669'};">${formatStock(item.qtyStock)}</td>
              <td style="text-align: center;">${formatMoney(item.weight)}</td>
              <td>${item.food || '—'}</td>
              <td>${item.medicine || '—'}</td>
            </tr>
          `).join("")}
          
          <tr style="background-color: #e0f2fe; font-weight: bold;">
            <td colspan="5" style="text-align: right; text-transform: uppercase;">Tổng cộng hệ thống:</td>
            <td style="text-align: center; color: #1d4ed8;">${totals.totalImport.toLocaleString('vi-VN')}</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center; color: #b45309;">${totals.totalExport.toLocaleString('vi-VN')}</td>
            <td style="text-align: center; color: #047857;">${totals.totalStock.toLocaleString('vi-VN')}</td>
            <td colspan="3"></td>
          </tr>
        </tbody>
      </table>

      <div class="summary-box">
        <div>Tổng SL Nhập: <span>${totals.totalImport.toLocaleString('vi-VN')}</span></div>
        <div>Tổng SL Xuất: <span>${totals.totalExport.toLocaleString('vi-VN')}</span></div>
        <div>Tổng Tồn Kho: <span style="color: #16a34a;">${totals.totalStock.toLocaleString('vi-VN')}</span></div>
      </div>

      <div class="footer-sign">
        <div class="sign-box">
          <div>Thủ kho / Người lập biểu</div>
          <div style="font-weight: normal; font-size: 11px; font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <br/><br/><br/>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("❌ Trình duyệt đã chặn cửa sổ bật lên (Popup blocked). Vui lòng cho phép popup để in!");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};