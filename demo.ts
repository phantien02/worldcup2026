import { fetchDailyFixturesFromApi } from './src/lib/scraper';

async function runDemo() {
  console.log("=== BẮT ĐẦU DEMO HỆ THỐNG GỌI API ===");
  
  // 1. Giả lập ngày hiện tại (ví dụ: ngày 22/06/2026)
  const today = '2026-06-22';
  
  console.log(`\n⏳ Đang fetch danh sách trận đấu từ API-Football cho ngày ${today}...`);
  const fixtures = await fetchDailyFixturesFromApi(today);
  
  console.log(`\n✅ Trả về tổng cộng: ${fixtures.length} trận đấu.`);
  
  // Lấy ra thử 3 trận đấu ngẫu nhiên để demo
  if (fixtures.length > 0) {
    console.log("\n📊 Mẫu dữ liệu API trả về (3 trận đầu tiên):");
    const sample = fixtures.slice(0, 3).map((f: any) => ({
      Trận_Đấu: `${f.teams.home.name} vs ${f.teams.away.name}`,
      Giờ_Đá: new Date(f.fixture.date).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      Trạng_Thái: f.fixture.status.short,
      Tỷ_Số: f.fixture.status.short === 'NS' ? 'Chưa đá' : `${f.goals.home} - ${f.goals.away}`
    }));
    console.table(sample);
  }
  
  console.log("\n💡 Trong thực tế, Bot sẽ so sánh tên tiếng Anh của đội nhà/khách trong hệ thống với trường 'Trận_Đấu' ở trên. Nếu tên khớp, nó sẽ bốc Tỷ_Số và Trạng_Thái về lưu vào Database ngay lập tức!");
  console.log("=== KẾT THÚC DEMO ===");
}

runDemo();
