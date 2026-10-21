export const printCongNo = ({
  filteredItems = [],
  selectedCustomer = "ALL",
  totalAmount = 0,
  totalPaid = 0,
  lastDebt = 0
}) => {
  if (!filteredItems || filteredItems.length === 0) {
    alert("❌ Không có dữ liệu công nợ để in!");
    return;
  }

  // Hàm định dạng tiền tệ
  const formatMoney = (val) => {
    if (!val && val !== 0) return '-';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '-';
    if (num < 0) return `(${Math.abs(num).toLocaleString('vi-VN')})`;
    return num.toLocaleString('vi-VN');
  };

  const customerTitle = selectedCustomer === "ALL" || selectedCustomer === "all" 
    ? "TẤT CẢ KHÁCH HÀNG" 
    : String(selectedCustomer).toUpperCase();

  const currentDate = new Date().toLocaleDateString('vi-VN');

  // Xây dựng mã nguồn HTML in ấn dạng bảng khổ ngang (Landscape)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Bảng Công Nợ Khách Hàng - Cửa hàng Thuận Phát</title>
      <style>
        /* Khổ giấy in ngang A4 để chứa trọn vẹn 11 cột dữ liệu */
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: "Times New Roman", serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
        
        .store-header { text-align: left; font-weight: bold; font-size: 13px; line-height: 1.4; color: #1e3a8a; }
        .report-title { text-align: center; color: #1e3a8a; font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 10px 0 5px 0; letter-spacing: 0.5px; }
        .report-subtitle { text-align: center; font-size: 14px; font-weight: bold; color: #dc2626; margin-bottom: 12px; }
        .print-date { text-align: right; font-size: 11px; font-style: italic; margin-bottom: 8px; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5px; }
        th, td { border: 1px solid #000; padding: 4px 5px; line-height: 1.2; word-wrap: break-word; white-space: normal; vertical-align: middle; font-size: 11px; }
        th { background-color: #dbeafe !important; color: #1e40af !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        /* Phân chia độ rộng chuẩn cho các cột bảng công nợ */
        th:nth-child(1), td:nth-child(1) { text-align: center; width: 4%; }   /* STT */
        th:nth-child(2), td:nth-child(2) { text-align: center; width: 8%; }   /* Ngày */
        th:nth-child(3), td:nth-child(3) { text-align: left; width: 13%; }    /* Khách hàng */
        th:nth-child(4), td:nth-child(4) { text-align: left; width: 16%; }    /* Tên hàng */
        th:nth-child(5), td:nth-child(5) { text-align: center; width: 6%; }   /* ĐVT */
        th:nth-child(6), td:nth-child(6) { text-align: center; width: 5%; }   /* SLg */
        th:nth-child(7), td:nth-child(7) { text-align: right; width: 8%; }    /* Đơn giá */
        th:nth-child(8), td:nth-child(8) { text-align: right; width: 9%; }    /* Thành tiền */
        th:nth-child(9), td:nth-child(9) { text-align: right; width: 9%; }    /* Thanh toán */
        th:nth-child(10), td:nth-child(10) { text-align: right; width: 9%; }  /* Còn lại */
        th:nth-child(11), td:nth-child(11) { text-align: left; width: 13%; }  /* Ghi chú */

        .summary-box { margin-top: 15px; font-size: 13px; font-weight: bold; display: flex; justify-content: flex-end; gap: 30px; }
        .summary-box div span { color: #dc2626; }
        
        .footer-sign { margin-top: 30px; display: flex; justify-content: flex-end; text-align: center; font-weight: bold; }
        .footer-sign .sign-box { width: 250px; }
      </style>
    </head>
    <body>
      <div class="store-header">
        CỬA HÀNG THUẬN PHÁT<br/>
        ĐC: 140 Đường Rừng Sác, Bình Khánh, TP.HCM<br/>
        ĐT: 0938.702.119
      </div>

      <div class="report-title">BẢNG CÔNG NỢ KHÁCH HÀNG</div>
      <div class="report-subtitle">Khách hàng: ${customerTitle}</div>
      <div class="print-date">Ngày lập báo cáo: ${currentDate}</div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Ngày</th>
            <th>Khách hàng</th>
            <th>Tên hàng</th>
            <th>ĐVT</th>
            <th>SLg</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>Thanh toán</th>
            <th>Còn lại</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map((item, index) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${index + 1}</td>
              <td style="text-align: center;">${item.date || '—'}</td>
              <td>${item.customer || ''}</td>
              <td style="font-weight: bold;">${item.itemName || ''}</td>
              <td style="text-align: center;">${item.unit || '—'}</td>
              <td style="text-align: center; font-weight: bold;">${item.qty || '—'}</td>
              <td style="text-align: right;">${formatMoney(item.price)}</td>
              <td style="text-align: right; font-weight: bold; color: #1e3a8a;">${formatMoney(item.amountNum)}</td>
              <td style="text-align: right; font-weight: bold; color: #16a34a;">${formatMoney(item.paidNum)}</td>
              <td style="text-align: right; font-weight: bold; color: ${item.debt < 0 ? '#16a34a' : '#dc2626'};">${formatMoney(item.debt)}</td>
              <td style="font-style: italic; font-size: 10px;">${item.note || '—'}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="summary-box">
        <div>Tổng tiền mua: <span>${totalAmount.toLocaleString('vi-VN')} VNĐ</span></div>
        <div>Đã thanh toán: <span>${totalPaid.toLocaleString('vi-VN')} VNĐ</span></div>
        <div>Dư nợ hiện tại: <span style="color: #dc2626;">${lastDebt.toLocaleString('vi-VN')} VNĐ</span></div>
      </div>

      <div class="footer-sign">
        <div class="sign-box">
          <div>Người lập biểu</div>
          <div style="font-weight: normal; font-size: 11px; font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <br/><br/><br/>
        </div>
      </div>
    </body>
    </html>
  `;

  // Mở cửa sổ in độc lập tránh lỗi dính giao diện web
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