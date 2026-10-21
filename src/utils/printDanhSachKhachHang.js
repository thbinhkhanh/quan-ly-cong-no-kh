export const printDanhSachKhachHang = ({
  filteredCustomers = [],
  searchTerm = ""
}) => {
  if (!filteredCustomers || filteredCustomers.length === 0) {
    alert("❌ Không có dữ liệu danh sách khách hàng để in!");
    return;
  }

  const currentDate = new Date().toLocaleDateString('vi-VN');

  // Xây dựng nội dung HTML in ấn chuyên nghiệp
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Danh Sách Khách Hàng - Cửa hàng Thuận Phát</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: "Times New Roman", serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
        
        .store-header { text-align: left; font-weight: bold; font-size: 13px; line-height: 1.4; color: #1e3a8a; }
        .report-title { text-align: center; color: #1e3a8a; font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 10px 0 5px 0; letter-spacing: 0.5px; }
        .report-subtitle { text-align: center; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 15px; }
        .print-date { text-align: right; font-size: 11px; font-style: italic; margin-bottom: 8px; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5px; }
        th, td { border: 1px solid #000; padding: 5px 6px; line-height: 1.2; word-wrap: break-word; white-space: normal; vertical-align: middle; }
        th { background-color: #1e3a8a !important; color: #ffffff !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        /* Căn chỉnh độ rộng và lề cho các cột */
        th:nth-child(1), td:nth-child(1) { text-align: center; width: 8%; }   /* STT */
        th:nth-child(2), td:nth-child(2) { text-align: left; width: 35%; }    /* Tên khách hàng */
        th:nth-child(3), td:nth-child(3) { text-align: center; width: 22%; }  /* Số điện thoại */
        th:nth-child(4), td:nth-child(4) { text-align: left; width: 35%; }    /* Địa chỉ */

        .summary-info { margin-top: 15px; font-size: 12px; font-style: italic; }
        .footer-sign { margin-top: 40px; display: flex; justify-content: flex-end; text-align: center; font-weight: bold; clear: both; }
        .sign-box { width: 250px; }
      </style>
    </head>
    <body>
      <div class="store-header">
        CỬA HÀNG THUẬN PHÁT<br/>
        ĐC: 140 Đường Rừng Sác, Bình Khánh, TP.HCM<br/>
        ĐT: 0938.702.119
      </div>

      <div class="report-title">DANH SÁCH KHÁCH HÀNG</div>
      ${searchTerm ? `<div class="report-subtitle">Từ khóa tìm kiếm: "${searchTerm}"</div>` : ''}
      <div class="print-date">Ngày lập báo cáo: ${currentDate}</div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên khách hàng</th>
            <th>Số điện thoại</th>
            <th>Địa chỉ</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCustomers.map((item, index) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${index + 1}</td>
              <td style="font-weight: bold;">${item.name || ''}</td>
              <td style="text-align: center; color: #1d4ed8;">${item.phone || '—'}</td>
              <td>${item.address || '—'}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="summary-info">
        Tổng số lượng khách hàng: <b>${filteredCustomers.length}</b> người
      </div>

      <div style="clear: both;"></div>

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