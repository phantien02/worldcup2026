const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
  creator: "Hệ thống Dự đoán WC 2026",
  title: "Báo cáo Logic Tính Điểm",
  description: "Báo cáo chi tiết về logic tính điểm và ước lượng điểm số cho người chơi.",
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "BÁO CÁO: LOGIC TÍNH ĐIỂM DỰ ĐOÁN WORLD CUP 2026",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "" }),
        
        new Paragraph({
          text: "1. Logic Tính Điểm Hiện Tại Của Hệ Thống",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({ text: "Giai đoạn Vòng Bảng (Tối đa 8 điểm/trận):", bold: true }),
          ],
        }),
        new Paragraph({ text: "Hệ thống tính điểm dựa trên Kết quả (Thắng/Thua/Hòa) và Tỷ số dự đoán của người chơi." }),
        new Paragraph({ text: "- Đoán sai kết quả: +0 điểm", bullet: { level: 0 } }),
        new Paragraph({ text: "- Đoán ĐÚNG kết quả: Hệ thống tự động cộng +5 điểm cơ bản. Sau đó xét tiếp tỷ số để cộng thêm điểm thưởng (Bonus):", bullet: { level: 0 } }),
        new Paragraph({ text: "+ Đoán đúng chính xác 100% tỷ số: Cộng thêm +3 điểm (Tổng = 8 điểm).", bullet: { level: 1 } }),
        new Paragraph({ text: "+ Đoán sai tỷ số nhưng có cùng hiệu số bàn thắng bại: Cộng thêm +1 điểm (Tổng = 6 điểm).", bullet: { level: 1 } }),
        new Paragraph({ text: "+ Đoán sai tỷ số và sai cả hiệu số: Không có điểm thưởng (Tổng = 5 điểm).", bullet: { level: 1 } }),
        
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({ text: "Giai đoạn Vòng Loại Trực Tiếp - Knockout (Tối đa 15 điểm/trận):", bold: true }),
          ],
        }),
        new Paragraph({ text: "Ở vòng này, luật tính điểm được tách biệt, ưu tiên vào việc tìm ra Đội đi tiếp và Cách thức giải quyết trận đấu." }),
        new Paragraph({ text: "- Đoán đúng Đội Đi Tiếp / Đội Chiến Thắng: Cộng +10 điểm.", bullet: { level: 0 } }),
        new Paragraph({ text: "  *Lưu ý: Chỉ khi đoán đúng đội đi tiếp, hệ thống mới xét tiếp hình thức phân định. Nếu đoán sai đội đi tiếp, nhận 0 điểm toàn cục cho trận đó.*" }),
        new Paragraph({ text: "- Đoán đúng Hình Thức Phân Định (Chỉ áp dụng nếu đoán đúng đội đi tiếp):", bullet: { level: 0 } }),
        new Paragraph({ text: "+ Đoán trúng hình thức (90 Phút / Hiệp phụ / Luân lưu): Cộng thêm +5 điểm (Tổng = 15 điểm).", bullet: { level: 1 } }),
        new Paragraph({ text: "+ Đoán sai hình thức: Không cộng thêm (Tổng = 10 điểm).", bullet: { level: 1 } }),

        new Paragraph({ text: "" }),
        new Paragraph({
          text: "2. Điểm Số Tối Đa Có Thể Đạt Được",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Với thể thức mới của World Cup 2026 (có 48 đội tham dự và tổng cộng 104 trận đấu), nếu một người chơi đoán đúng tuyệt đối 100% tất cả các trận, số điểm tối đa sẽ là 1.056 điểm." }),
        new Paragraph({ text: "- Giai đoạn Vòng Bảng (72 trận): 72 trận x 8 điểm = 576 điểm.", bullet: { level: 0 } }),
        new Paragraph({ text: "- Giai đoạn Knockout (32 trận): 32 trận x 15 điểm = 480 điểm.", bullet: { level: 0 } }),
        new Paragraph({
          children: [
            new TextRun({ text: "TỔNG CỘNG: 576 + 480 = 1.056 điểm.", bold: true }),
          ],
        }),

        new Paragraph({ text: "" }),
        new Paragraph({
          text: "3. Ước Tính Điểm Trung Bình Khảo Sát",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Giả sử hệ thống có khoảng 30 người chơi tham gia đầy đủ toàn bộ các trận đấu. Theo xác suất dự đoán bóng đá thực tế, chúng ta có bảng tính Điểm kỳ vọng (Expected Value - EV) như sau:" }),
        new Paragraph({ text: "- Kỳ vọng ở Vòng Bảng: Mỗi trận người bình thường mang về khoảng 3.0 điểm. Tổng trung bình vòng bảng = ~216 điểm.", bullet: { level: 0 } }),
        new Paragraph({ text: "- Kỳ vọng ở Vòng Knockout: Mỗi trận Knockout mang về khoảng 8.1 điểm. Tổng trung bình vòng Knockout = ~259 điểm.", bullet: { level: 0 } }),
        new Paragraph({ text: "Tổng điểm trung bình toán học của một người chơi sẽ là khoảng 475 điểm (tương đương ~45% tổng điểm tối đa)." }),
        
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [
            new TextRun({ text: "Phân bổ bảng xếp hạng ước tính cho 30 người:", bold: true }),
          ],
        }),
        new Paragraph({ text: "1. Nhóm 'Chuyên Gia' (Top 3 - Top 5): Đạt khoảng 550 - 650 điểm. Những người có kinh nghiệm, khả năng đọc trận đấu tốt và có sự may mắn.", bullet: { level: 0 } }),
        new Paragraph({ text: "2. Nhóm Trung Bình Số Đông (Top 6 - Top 20): Xoay quanh 400 - 500 điểm. Dự đoán theo cảm tính hoặc độ nổi tiếng của đội bóng.", bullet: { level: 0 } }),
        new Paragraph({ text: "3. Nhóm Dưới Bảng (Top 21 - Top 30): Dưới 350 điểm. Người chơi bắt cảm tính bất chấp tương quan lực lượng hoặc quên dự đoán một số trận.", bullet: { level: 0 } }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("C:/Users/tienpc1/.gemini/antigravity/scratch/Bao_cao_Logic_Tinh_Diem_WC2026.docx", buffer);
  console.log("Document created successfully");
});
