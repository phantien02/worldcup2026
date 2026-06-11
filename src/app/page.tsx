"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import WorldCupStandings from '@/components/WorldCupStandings';
import ProfileUpdateForm from '@/components/ProfileUpdateForm';
import { resolvePlaceholderTeam } from '@/utils/standings';
import matchMapping from '../data/matchMapping.json';

type Profile = {
  id: string;
  display_name: string;
  total_points: number;
};

type Match = {
  id: string;
  home_team: { name: string; flag_url: string };
  away_team: { name: string; flag_url: string };
  kickoff_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  round?: string;
  win_method?: string;
  score_90_home?: number | null;
  score_90_away?: number | null;
  penalty_home?: number | null;
  penalty_away?: number | null;
  winner_id?: string | null;
};

export default function HomePage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches' | 'standings' | 'rules' | 'profile'>('matches');
  const [filterRound, setFilterRound] = useState('All');
  const [myPredictions, setMyPredictions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      async function fetchPreds() {
        const { data: preds } = await supabase
          .from('predictions')
          .select('match_id')
          .eq('user_id', user!.id);
        if (preds) setMyPredictions(preds);
      }
      fetchPreds();
    }
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      // Fetch leaderboard
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false });

      if (profiles) setLeaderboard(profiles);

      // Fetch matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id, kickoff_time, status, home_score, away_score, round,
          win_method, score_90_home, score_90_away, penalty_home, penalty_away, winner_id,
          home_team:home_team_id (name, flag_url),
          away_team:away_team_id (name, flag_url)
        `)

      if (matchesData) {
        const validMatches = (matchesData as any).filter((m: any) => m.round !== 'DELETED');
        
        // Sort by chronological order
        validMatches.sort((a: any, b: any) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
        
        setMatches(validMatches);
      }
      
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <div className="text-center mt-8">Đang tải dữ liệu...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh', padding: '2rem 1rem' }}>
        <h1 className="logo mb-6 text-center text-5xl md:text-7xl" style={{ lineHeight: 1.1 }}>
          Dự Đoán World Cup 2026
        </h1>
        <p className="text-center mb-10" style={{ fontSize: '1.25rem', color: '#a3a3a3', maxWidth: '700px', lineHeight: 1.6 }}>
          Hòa mình vào không khí sôi động của World Cup 2026. Thể hiện tài dự đoán thiên bẩm, leo top bảng xếp hạng và giành lấy vinh quang!
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <button className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.25rem', borderRadius: '50px' }}>
              CHƠI NGAY
            </button>
          </Link>
          <Link href="/login">
            <button className="btn btn-secondary" style={{ padding: '1rem 3rem', fontSize: '1.25rem', borderRadius: '50px' }}>
              ĐĂNG NHẬP
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 mt-8 pb-16">
      {/* Hero Section */}
      <div className="text-center animate-fade-in" style={{ padding: '2rem 1rem' }}>
        <h1 className="logo mb-4 text-4xl md:text-6xl" style={{ lineHeight: 1.2 }}>
          Dự Đoán World Cup 2026
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#a3a3a3', maxWidth: '600px', margin: '0 auto' }}>
          Chào mừng trở lại, <span style={{ color: '#fff', fontWeight: 'bold' }}>{user.user_metadata?.display_name}</span>! Hãy bắt đầu dự đoán các trận đấu bên dưới.
        </p>
      </div>

      {(() => {
        const now = new Date();
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const unpredicted = matches.filter(m => {
          if (m.status !== 'pending') return false;
          const time = new Date(m.kickoff_time);
          if (time < now || time > next24Hours) return false;
          return !myPredictions.some(p => p.match_id === m.id);
        });
        
        if (unpredicted.length > 0) {
          return (
            <div className="animate-fade-in flex justify-center" style={{ width: '100%', marginBottom: '2rem' }}>
              <div style={{ width: '90%', maxWidth: '800px', background: 'rgba(255,0,76,0.15)', border: '2px solid var(--danger)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textAlign: 'center', margin: '0 auto' }}>
                <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px var(--danger))' }}>⏰</span>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>Cảnh báo: Bạn sắp bỏ lỡ điểm số!</h3>
                <p style={{ color: 'var(--danger)', margin: 0, fontWeight: 500, opacity: 0.9 }}>
                  Có <strong>{unpredicted.length} trận đấu</strong> diễn ra trong vòng 24 giờ tới mà bạn chưa dự đoán. Đừng để tuột mất cơ hội!
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Tabs Navigation */}
      <div className="flex flex-nowrap md:flex-wrap justify-start md:justify-center gap-3 md:gap-4 animate-fade-in overflow-x-auto no-scrollbar pb-2 px-1" style={{ animationDelay: '0.1s' }}>
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`btn ${activeTab === 'matches' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 flex-shrink-0 whitespace-nowrap`}
          style={{ borderRadius: '50px' }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚽</span> LỊCH THI ĐẤU
        </button>
        <button 
          onClick={() => setActiveTab('standings')} 
          className={`btn ${activeTab === 'standings' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 flex-shrink-0 whitespace-nowrap`}
          style={{ borderRadius: '50px' }}
        >
          <span style={{ fontSize: '1.2rem' }}>📊</span> BXH WORLD CUP
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          className={`btn ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 flex-shrink-0 whitespace-nowrap`}
          style={{ borderRadius: '50px' }}
        >
          <span style={{ fontSize: '1.2rem' }}>🏆</span> BXH NGƯỜI CHƠI
        </button>
        <button 
          onClick={() => setActiveTab('rules')} 
          className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 flex-shrink-0 whitespace-nowrap`}
          style={{ borderRadius: '50px' }}
        >
          <span style={{ fontSize: '1.2rem' }}>📖</span> HƯỚNG DẪN
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 flex-shrink-0 whitespace-nowrap`}
          style={{ borderRadius: '50px' }}
        >
          <span style={{ fontSize: '1.2rem' }}>👤</span> TÀI KHOẢN
        </button>
      </div>

      <div className="flex justify-center px-4 md:px-0">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in">
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 className="text-2xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <span style={{ color: 'var(--accent)' }}>●</span> Cập Nhật Thông Tin
              </h2>
              <ProfileUpdateForm user={user} />
            </div>
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            <WorldCupStandings matches={matches} />
          </div>
        )}

        {/* Rules / Guide */}
        {activeTab === 'rules' && (
          <div className="glass-panel animate-fade-in mx-auto" style={{ padding: '2rem', maxWidth: '900px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
            <h2 className="text-2xl font-bold mb-6 text-center text-white uppercase tracking-wider">
              <span style={{ color: '#00d2ff' }}>●</span> Thể lệ tính điểm dự đoán trận đấu
            </h2>
            <div style={{ color: '#d0d0d0', lineHeight: '1.8', fontSize: '1.05rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 className="font-bold text-white text-2xl mb-2 border-b border-gray-700 pb-2" style={{ color: '#ff9900' }}>I. Các Trận Vòng Bảng</h3>
              <p>
                Người chơi thực hiện dự đoán theo 2 bước: <strong>dự đoán kết quả trận đấu</strong> và <strong>dự đoán tỷ số</strong>.
              </p>

              <div>
                <h3 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>1. Dự đoán kết quả trận đấu</h3>
                <p className="mb-2">Người chơi chọn một trong ba kết quả: Đội A thắng, Hòa hoặc Đội B thắng.</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Dự đoán đúng kết quả trận đấu: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  <li>Dự đoán sai kết quả trận đấu: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>2. Dự đoán tỷ số (không bắt buộc)</h3>
                <p className="mb-2">Người chơi có thể dự đoán tỷ số cụ thể của trận đấu.</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Dự đoán đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+3 điểm</strong></li>
                  <li>Dự đoán sai tỷ số nhưng đúng hiệu số bàn thắng bại: <strong style={{ color: '#ffcc00' }}>+1 điểm</strong></li>
                  <li>Dự đoán sai tỷ số và sai hiệu số bàn thắng bại: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-bold text-white text-center text-lg mb-0">
                  Tổng điểm nhận được = <span style={{ color: '#00d2ff' }}>Điểm dự đoán kết quả</span> + <span style={{ color: '#00d2ff' }}>Điểm dự đoán tỷ số</span>
                </p>
              </div>

              <h3 className="font-bold text-white text-2xl mt-4 mb-2 text-center" style={{ color: '#ff9900' }}>Ví dụ minh họa</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00ff87' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 1: Đúng kết quả và đúng tỷ số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Kết quả thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 2-1 Đội B</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng tỷ số: <strong style={{ color: '#00ff87' }}>+3 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00ff87', fontSize: '1.125rem' }}>8 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00d2ff' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 2: Đúng kết quả, sai tỷ số nhưng đúng hiệu số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Kết quả thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 3-2 Đội B</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Sai tỷ số nhưng cùng hiệu số (+1): <strong style={{ color: '#ffcc00' }}>+1 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00d2ff', fontSize: '1.125rem' }}>6 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ffcc00' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 3: Đúng kết quả nhưng sai tỷ số và sai hiệu số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Kết quả thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 3-1 Đội B</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Sai tỷ số và sai hiệu số: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ffcc00', fontSize: '1.125rem' }}>5 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ff004c' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 4: Sai kết quả trận đấu</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Kết quả thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Hòa 1-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai kết quả: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                    <li>Sai tỷ số và sai hiệu số: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ff004c', fontSize: '1.125rem' }}>0 điểm</span></div>
                </div>
              </div>

              <h3 className="font-bold text-white text-2xl mt-8 mb-2 border-b border-gray-700 pb-2" style={{ color: '#ff9900' }}>II. Các Trận Loại Trực Tiếp (Knock-out)</h3>
              <p>
                Đối với các trận đấu loại trực tiếp (Từ Vòng 1/16 đến Chung kết), người chơi dự đoán <strong>Đội đi tiếp</strong> (hoặc Đội vô địch) và <strong>Hình thức phân định thắng thua</strong>.
              </p>
              
              <div>
                <h4 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>1. Dự đoán Đội đi tiếp</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Đoán trúng đội đi tiếp / chiến thắng: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                  <li>Đoán sai đội đi tiếp: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>2. Dự đoán Hình thức phân định</h4>
                <p className="mb-2">Người chơi chọn 1 trong 3 hình thức: Trong 90 Phút, Hiệp phụ (120 Phút), hoặc Luân lưu (Penalty).</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Chỉ được cộng điểm phần này nếu đã <strong style={{ color: '#ffcc00' }}>đoán đúng đội đi tiếp</strong>.</li>
                  <li>Đoán đúng hình thức phân định: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  <li>Đoán sai hình thức phân định: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-bold text-white text-center text-lg mb-0">
                  Tổng điểm tối đa cho mỗi trận = <span style={{ color: '#00ff87' }}>15 điểm</span>
                </p>
              </div>

              <h3 className="font-bold text-white text-2xl mt-4 mb-2 text-center" style={{ color: '#ff9900' }}>Ví dụ minh họa (Knock-out)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00ff87' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 1: Đúng đội, đúng hình thức</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng sau loạt Luân lưu</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A đi tiếp bằng Luân lưu</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Đúng hình thức: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00ff87', fontSize: '1.125rem' }}>15 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00d2ff' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 2: Đúng đội, sai hình thức</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng trong 90 Phút</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A đi tiếp bằng Hiệp phụ</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Sai hình thức: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00d2ff', fontSize: '1.125rem' }}>10 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ffcc00' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 3: Sai đội, đúng hình thức</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội B thắng trong Hiệp phụ</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A đi tiếp bằng Hiệp phụ</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai đội đi tiếp: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Sai hình thức (do sai đội): <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ffcc00', fontSize: '1.125rem' }}>0 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ff004c' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 4: Sai hoàn toàn</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội B thắng bằng Luân lưu</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A đi tiếp trong 90 Phút</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai đội đi tiếp: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                    <li>Sai hình thức: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ff004c', fontSize: '1.125rem' }}>0 điểm</span></div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
        <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in">
          <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 justify-center mb-2">
            <span style={{ color: '#ff9900' }}>●</span> BXH Người Chơi
          </h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {leaderboard.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem 0', opacity: 0.5 }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                Chưa có ai ghi điểm. Hãy là người đầu tiên!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {leaderboard.map((user, idx) => (
                  <div key={user.id} className="flex justify-between items-center hover-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                    <div className="flex items-center gap-4">
                      <span style={{ 
                        fontWeight: '900', 
                        fontSize: '1.25rem',
                        width: '32px', 
                        textAlign: 'center',
                        color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'inherit' 
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user.display_name}</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '1rem' }}>{user.total_points} đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (() => {
          const uniqueRounds = Array.from(new Set(matches.map(m => m.round))).filter(Boolean);
          uniqueRounds.sort((a: any, b: any) => {
            const getRank = (r: string) => {
              const lower = r.toLowerCase();
              if (lower.startsWith('bảng') || lower.startsWith('vòng bảng')) return 1;
              if (lower.includes('32')) return 2;
              if (lower.includes('16') || lower.includes('1/8')) return 3;
              if (lower.includes('tứ kết')) return 4;
              if (lower.includes('bán kết')) return 5;
              if (lower.includes('hạng 3')) return 6;
              if (lower.includes('chung kết')) return 7;
              return 8;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
          });

          const filteredMatches = filterRound === 'All' ? matches : matches.filter(m => m.round === filterRound);

          return (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 m-0">
                  <span style={{ color: 'var(--accent)' }}>●</span> Lịch Thi Đấu
                </h2>
                
                {matches.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Lọc theo vòng:</label>
                    <select 
                      value={filterRound}
                      onChange={(e) => setFilterRound(e.target.value)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#0a0a0a',
                        color: '#fff',
                        border: '2px solid #7a00ff',
                        borderRadius: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem top 50%',
                        backgroundSize: '0.65rem auto',
                        paddingRight: '2.5rem',
                        minWidth: '180px'
                      }}
                    >
                      <option value="All">Tất cả</option>
                      {uniqueRounds.map(r => (
                        <option key={r as string} value={r as string}>{r as string}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-5">
                {filteredMatches.length === 0 ? (
                  <div className="glass-panel text-center" style={{ padding: '4rem 2rem', opacity: 0.6 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚽</div>
                    {matches.length === 0 ? 'Chưa có trận đấu nào được lên lịch. Admin sẽ sớm cập nhật!' : 'Không có trận đấu nào trong vòng này.'}
                  </div>
                ) : (
                  filteredMatches.map((match) => {
                    const globalIndex = matches.findIndex(m => m.id === match.id) + 1;
                    
                    const isPlaceholderName = (name: string) => /^(nhất|nhì|ba|thứ\s*3|thắng|thua)\s/i.test(name);
                    const renderTeamInfo = (teamData: any) => {
                      if (!teamData) return { name: 'TBD', flag: null };
                      const resolved = resolvePlaceholderTeam(teamData.name, matches);
                      if (resolved) {
                        return { name: resolved.name, flag: resolved.flag_url };
                      }
                      if (isPlaceholderName(teamData.name)) {
                        return { name: teamData.name, flag: null };
                      }
                      return { name: teamData.name, flag: teamData.flag_url };
                    };
                    
                    const home = renderTeamInfo(match.home_team);
                    const away = renderTeamInfo(match.away_team);

                    return (
                    <Link href={`/match/${match.id}`} key={match.id}>
                      <div className="glass-panel hover-card" style={{ padding: '2rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        {match.status === 'live' && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)' }}></div>
                        )}
                        
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-3">
                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', color: '#00d2ff', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                              {(matchMapping as any)[`${home.name} vs ${away.name}`] || `TRẬN ${globalIndex}`}
                            </span>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                              {new Date(match.kickoff_time).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span className={`badge ${match.status === 'live' ? 'badge-danger' : match.status === 'finished' ? 'badge-success' : 'badge-warning'}`}>
                            {match.status === 'live' ? 'Đang đá' : match.status === 'finished' ? 'Đã xong' : 'Sắp diễn ra'}
                          </span>
                        </div>

                    <div className="grid grid-cols-3 gap-2 items-center w-full">
                      {/* Home Team */}
                      <div className="flex flex-col items-center gap-2" style={{ minWidth: 0 }}>
                        {home.flag ? 
                          <img src={home.flag} className="flag-icon" style={{ width: '60px', height: '45px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('hidden'); (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} /> 
                          : null
                        }
                        <div className="flag-icon flex items-center justify-center text-gray-400 font-bold" style={{ width: '60px', height: '45px', background: 'rgba(255,255,255,0.05)', fontSize: '1.2rem', display: home.flag ? 'none' : 'flex' }} hidden={home.flag ? true : undefined}>?</div>
                        <span className="text-center font-bold text-sm md:text-xl truncate w-full px-1">{home.name}</span>
                      </div>
                      
                      {/* Score / VS */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-center" style={{ 
                          fontSize: match.status !== 'pending' ? '2.2rem' : '1.8rem', 
                          fontWeight: '900', 
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.05em'
                        }}>
                          {match.status !== 'pending' ? `${match.home_score} - ${match.away_score}` : 'VS'}
                        </div>
                        {match.status !== 'pending' && match.win_method && match.win_method !== '90_mins' && (
                          <div className="text-center mt-1" style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                            {match.win_method === 'extra_time' ? "(Hiệp phụ)" : `(Pen: ${match.penalty_home} - ${match.penalty_away})`}
                          </div>
                        )}
                        {match.status === 'pending' && <div className="mt-1 font-bold text-center" style={{ fontSize: '0.75rem', color: 'var(--success)' }}>DỰ ĐOÁN NGAY</div>}
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center gap-2" style={{ minWidth: 0 }}>
                        {away.flag ? 
                          <img src={away.flag} className="flag-icon" style={{ width: '60px', height: '45px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('hidden'); (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} /> 
                          : null
                        }
                        <div className="flag-icon flex items-center justify-center text-gray-400 font-bold" style={{ width: '60px', height: '45px', background: 'rgba(255,255,255,0.05)', fontSize: '1.2rem', display: away.flag ? 'none' : 'flex' }} hidden={away.flag ? true : undefined}>?</div>
                        <span className="text-center font-bold text-sm md:text-xl truncate w-full px-1">{away.name}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
            </div>
          )
        })()}
      </div>
    </div>
  );
}
