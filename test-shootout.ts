require('dotenv').config({ path: '.env.local' });
import { analyzeWithGemini } from './src/lib/scraper';

const mockText = `
Trực tiếp Argentina vs Pháp: Messi và đồng đội vô địch World Cup sau loạt sút luân lưu nghẹt thở.
Hiệp 1, Messi mở tỷ số trên chấm phạt đền (pen) ở phút 23'. Phút 36', Di Maria nhân đôi cách biệt từ đường chọc khe của Mac Allister.
Sang hiệp 2, Mbappe bùng nổ lập cú đúp ở phút 80' (phạt đền) và 81' đưa trận đấu về vạch xuất phát.
Vào hiệp phụ, Messi tiếp tục tỏa sáng nâng tỷ số lên 3-2 ở phút 109'. Nhưng lại là Mbappe hoàn tất cú hat-trick trên chấm 11m (ph.đ.) ở phút 118' gỡ hòa 3-3 (s.h.p.).
Hai đội bước vào loạt sút luân lưu. 
Bên phía Argentina: Messi sút vào, Dybala sút vào, Paredes sút vào, Montiel sút vào.
Bên phía Pháp: Mbappe sút vào, Coman sút trượt, Tchouameni sút trượt, Kolo Muani sút vào.
Kết quả luân lưu Argentina thắng Pháp 4-2.
Hết giờ.
`;

(async () => {
  console.log("Đang phân tích trận đấu giả lập bằng AI...");
  const result = await analyzeWithGemini(mockText, "Argentina", "Pháp");
  console.log("KẾT QUẢ AI TRẢ VỀ:");
  console.log(JSON.stringify(result, null, 2));
})();
