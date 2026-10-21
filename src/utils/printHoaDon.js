export const printHoaDon = ({
  customerName = "",
  customerAddress = "",
  customerPhone = "",
  date = "",
  rows = [],
  totalAmount = 0,
  paidAmount = 0,
  remainingDebt = 0
}) => {
  // 1. Lọc lấy các dòng có sản phẩm được chọn (có tên hàng)
  const validRows = (rows || []).filter(r => r.itemName && r.itemName.trim() !== "");
  if (validRows.length === 0) {
    alert("❌ Không có sản phẩm nào trong phiếu để in!");
    return;
  }

  // 2. Hàm định dạng tiền tệ VNĐ
  const formatMoney = (val) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("vi-VN");
  };

  // 3. Xây dựng nội dung HTML in ấn chuẩn văn bản / PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Phiếu Xuất Kho - Cửa hàng Thuận Phát</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: "Times New Roman", serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
        .store-header { text-align: left; font-weight: bold; font-size: 13px; line-height: 1.4; color: #1e3a8a; }
        .invoice-title { text-align: center; color: #dc2626; font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 10px 0 5px 0; letter-spacing: 1px; }
        .invoice-date { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 15px; }
        .customer-info { margin-bottom: 10px; font-size: 13px; line-height: 1.5; font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5px; }
        th, td { border: 1px solid #000; padding: 5px 6px; line-height: 1.2; word-wrap: break-word; white-space: normal; vertical-align: middle; }
        th { background-color: #f3f4f6; color: #1e3a8a; font-weight: bold; }
        
        /* Đồng bộ chiều rộng và căn lề chính xác cho cả TH và TD */
        th:nth-child(1), td:nth-child(1) { text-align: center; width: 5%; }   /* STT */
        th:nth-child(2), td:nth-child(2) { text-align: left; width: 35%; }    /* Tên hàng */
        th:nth-child(3), td:nth-child(3) { text-align: center; width: 10%; }  /* ĐVT */
        th:nth-child(4), td:nth-child(4) { text-align: right; width: 13%; }   /* Đơn giá */
        th:nth-child(5), td:nth-child(5) { text-align: center; width: 10%; }  /* Số lượng */
        th:nth-child(6), td:nth-child(6) { text-align: right; width: 14%; }   /* Thành tiền */
        th:nth-child(7), td:nth-child(7) { text-align: left; width: 13%; }    /* Ghi chú */

        .summary-section { margin-top: 15px; font-size: 13px; font-weight: bold; line-height: 1.6; float: right; text-align: right; }
        .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-weight: bold; clear: both; }
      </style>
    </head>
    <body>
      <div class="store-header">
        CỬA HÀNG THUẬN PHÁT<br/>
        ĐC: 140 Đường Rừng Sác, Bình Khánh, TP.HCM<br/>
        ĐT: 0938.702.119
      </div>

      <div class="invoice-title">PHIẾU XUẤT KHO</div>
      <div class="invoice-date">Ngày lập: ${date || new Date().toLocaleDateString("vi-VN")}</div>

      <div class="customer-info">
        <div>Khách hàng: ${customerName || "Khách lẻ"}</div>
        <div>Địa chỉ: ${customerAddress || "---"} &nbsp;&nbsp;&nbsp;&nbsp; SĐT: ${customerPhone || "---"}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>TÊN HÀNG</th>
            <th>ĐVT</th>
            <th>ĐƠN GIÁ</th>
            <th>SỐ LƯỢNG</th>
            <th>THÀNH TIỀN</th>
            <th>GHI CHÚ</th>
          </tr>
        </thead>
        <tbody>
          ${validRows.map((r, index) => `
            <tr>
              <td style="text-align: center;">${index + 1}</td>
              <td style="text-align: left;">${r.itemName || ""}</td>
              <td style="text-align: center;">${r.unit || ""}</td>
              <td style="text-align: right;">${formatMoney(r.price)}</td>
              <td style="text-align: center;">${r.qty || ""}</td>
              <td style="text-align: right;">${formatMoney(r.amount)}</td>
              <td style="text-align: left;">${r.note || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="summary-section">
        <div>Tổng tiền hàng: ${formatMoney(totalAmount)} VNĐ</div>
        <div>Đã thanh toán: ${formatMoney(paidAmount)} VNĐ</div>
        <div style="color: #dc2626;">Còn lại (Công nợ): ${formatMoney(remainingDebt)} VNĐ</div>
      </div>

      <div style="clear: both;"></div>

      <div class="footer-sign">
        <div style="width: 50%;">
          <br/><b>Người nhận hàng</b><br/>(Ký, ghi rõ họ tên)
        </div>
        <div style="width: 50%;">
          <b>Người lập phiếu</b><br/>(Ký, ghi rõ họ tên)
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. Mở cửa sổ in độc lập, chắc chắn hiển thị bản in không bị lỗi
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("❌ Trình duyệt đã chặn cửa sổ bật lên (Popup blocked). Vui lòng cho phép popup để in!");
    return;
  }
  
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Tự động kích hoạt hộp thoại in sau khi cửa sổ sẵn sàng
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};