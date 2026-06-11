-- Chạy đoạn script này trong mục SQL Editor của Supabase
-- Để bảo vệ cơ sở dữ liệu khỏi các cuộc tấn công thay đổi dữ liệu trái phép

-- 1. Kích hoạt Row Level Security (RLS) cho tất cả các bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_requests ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ (nếu có) để tránh lỗi trùng lặp
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Teams are viewable by everyone." ON teams;
DROP POLICY IF EXISTS "Matches are viewable by everyone." ON matches;
DROP POLICY IF EXISTS "Predictions are viewable by everyone." ON predictions;
DROP POLICY IF EXISTS "Users can insert own predictions." ON predictions;
DROP POLICY IF EXISTS "Users can update own predictions." ON predictions;
DROP POLICY IF EXISTS "Users can insert password requests." ON password_requests;

-- 2. Thiết lập quyền cho bảng profiles (Người dùng)
-- Mọi người đều có thể xem (để hiện Bảng xếp hạng)
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
-- Người dùng chỉ được sửa thông tin CỦA CHÍNH MÌNH (khi đã đăng nhập)
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Thiết lập quyền cho bảng teams (Đội bóng)
-- Mọi người đều có thể xem
CREATE POLICY "Teams are viewable by everyone." ON teams FOR SELECT USING (true);
-- (Mọi thao tác Thêm/Sửa/Xóa chỉ dành cho Admin sử dụng Service Role)

-- 4. Thiết lập quyền cho bảng matches (Trận đấu)
-- Mọi người đều có thể xem
CREATE POLICY "Matches are viewable by everyone." ON matches FOR SELECT USING (true);
-- (Chỉ Admin mới có quyền tạo và cập nhật kết quả)

-- 5. Thiết lập quyền cho bảng predictions (Dự đoán)
-- Mọi người có thể xem dự đoán của nhau (hệ thống frontend tự khóa hiển thị nếu trận chưa đá)
CREATE POLICY "Predictions are viewable by everyone." ON predictions FOR SELECT USING (true);
-- Người dùng chỉ được lưu/sửa dự đoán CỦA CHÍNH MÌNH
CREATE POLICY "Users can insert own predictions." ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions." ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- 6. Thiết lập quyền cho bảng password_requests (Yêu cầu mật khẩu)
-- Cho phép bất kỳ ai (kể cả khách) gửi yêu cầu
CREATE POLICY "Users can insert password requests." ON password_requests FOR INSERT WITH CHECK (true);
-- Không cấp quyền SELECT, chỉ Admin (Service Role) mới đọc được danh sách này.

-- LƯU Ý KỸ THUẬT:
-- Các API trong Next.js sử dụng `supabaseAdmin` (Service Role Key) 
-- sẽ có đặc quyền tối cao, tự động đi xuyên qua và phớt lờ mọi quy tắc RLS này.
-- Do đó Admin vẫn hoạt động bình thường!
