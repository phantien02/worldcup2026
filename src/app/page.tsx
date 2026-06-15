"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import WorldCupStandings from '@/components/WorldCupStandings';
import ProfileUpdateForm from '@/components/ProfileUpdateForm';
import { resolvePlaceholderTeam } from '@/utils/standings';
import matchMapping from '../data/matchMapping.json';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const isGuest = user?.email === 'guest@wc2026.local';
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches' | 'standings' | 'rules' | 'profile'>('matches');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterRound, setFilterRound] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [leaderboardView, setLeaderboardView] = useState<'list' | 'chart'>('list');

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
      try {
        const lbRes = await fetch('/api/leaderboard');
        const lbData = await lbRes.json();
        if (lbData.success) {
          setLeaderboard(lbData.leaderboard);
        }
      } catch (err) {
        console.error("Error fetching leaderboard", err);
      }

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

    const channel = supabase.channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          Chào mừng trở lại, <span style={{ color: '#fff', fontWeight: 'bold' }}>{isGuest ? 'Khách Tham Quan' : user.user_metadata?.display_name}</span>! Hãy bắt đầu dự đoán các trận đấu bên dưới.
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
      
      {/* Desktop Tabs Navigation (Hidden on Mobile) */}
      <div className="hidden md:flex flex-wrap justify-center gap-4 animate-fade-in w-full mb-8" style={{ animationDelay: '0.1s' }}>
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`btn ${activeTab === 'matches' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          style={{ borderRadius: '50px', padding: '0.8rem 1.5rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚽</span> LỊCH THI ĐẤU
        </button>
        <button 
          onClick={() => setActiveTab('standings')} 
          className={`btn ${activeTab === 'standings' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          style={{ borderRadius: '50px', padding: '0.8rem 1.5rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>📊</span> BXH WORLD CUP
        </button>
        {!isGuest && (
          <button 
            onClick={() => setActiveTab('leaderboard')} 
            className={`btn ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            style={{ borderRadius: '50px', padding: '0.8rem 1.5rem' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🏆</span> BXH NGƯỜI CHƠI
          </button>
        )}
        <button 
          onClick={() => setActiveTab('rules')} 
          className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          style={{ borderRadius: '50px', padding: '0.8rem 1.5rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>📖</span> HƯỚNG DẪN
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          style={{ borderRadius: '50px', padding: '0.8rem 1.5rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>👤</span> TÀI KHOẢN
        </button>
      </div>

      {/* Mobile Dropdown Navigation Menu (Hidden on Desktop) */}
      <div className="md:hidden relative w-full mx-auto mb-8 z-50" style={{ maxWidth: '320px' }}>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="btn btn-primary w-full flex justify-center items-center"
          style={{ padding: '0.8rem 1rem', borderRadius: isMobileMenuOpen ? '20px 20px 0 0' : '50px', transition: 'border-radius 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', gap: '0.5rem' }}
        >
          <span style={{ fontSize: '1.2rem' }}>
            {activeTab === 'matches' ? '⚽' : activeTab === 'standings' ? '📊' : activeTab === 'leaderboard' ? '🏆' : activeTab === 'rules' ? '📖' : '👤'}
          </span>
          <span className="font-bold uppercase tracking-wider" style={{ fontSize: '1rem' }}>
            {activeTab === 'matches' ? 'LỊCH THI ĐẤU' : activeTab === 'standings' ? 'BXH WORLD CUP' : activeTab === 'leaderboard' ? 'BXH NGƯỜI CHƠI' : activeTab === 'rules' ? 'HƯỚNG DẪN' : 'TÀI KHOẢN'}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', marginLeft: '8px', transition: 'transform 0.2s', transform: isMobileMenuOpen ? 'rotate(180deg)' : 'none' }}><path d="M19 9l-7 7-7-7"/></svg>
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full flex flex-col shadow-2xl overflow-hidden animate-fade-in" style={{ background: 'rgba(22, 27, 34, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', borderRadius: '0 0 20px 20px' }}>
            {[
              { id: 'matches', icon: '⚽', label: 'LỊCH THI ĐẤU' },
              { id: 'standings', icon: '📊', label: 'BXH WORLD CUP' },
              { id: 'leaderboard', icon: '🏆', label: 'BXH NGƯỜI CHƠI' },
              { id: 'rules', icon: '📖', label: 'HƯỚNG DẪN' },
              { id: 'profile', icon: '👤', label: 'TÀI KHOẢN' }
            ].filter(t => !isGuest || t.id !== 'leaderboard').map((tab, idx, arr) => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setIsMobileMenuOpen(false); }} 
                className="flex justify-center items-center w-full hover-card"
                style={{ 
                  padding: '1rem',
                  gap: '0.75rem',
                  borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: activeTab === tab.id ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : '#e5e7eb',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span> 
                <span className="font-bold uppercase tracking-wider" style={{ fontSize: '0.95rem' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
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
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in mx-auto">
          <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 justify-center mb-6">
            <span style={{ color: '#ff9900' }}>●</span> BXH Người Chơi
          </h2>
          
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap text-gray-300 md:text-white">Giao diện:</label>
              <select 
                value={leaderboardView}
                onChange={(e) => setLeaderboardView(e.target.value as 'list' | 'chart')}
                className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#ff9900] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-5 md:pr-10 w-[140px] md:min-w-[200px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem top 50%',
                  backgroundSize: '0.65rem auto',
                }}
              >
                <option value="list">📋 Dạng Danh Sách</option>
                <option value="chart">📈 Dạng Biểu Đồ</option>
              </select>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            {leaderboard.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem 0', opacity: 0.5 }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                Chưa có ai ghi điểm. Hãy là người đầu tiên!
              </div>
            ) : leaderboardView === 'list' ? (
              <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px', fontSize: '0.95rem', textAlign: 'left', minWidth: '700px' }}>
                  <thead style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    <tr>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '80px' }}>Hạng</th>
                      <th style={{ padding: '0 1rem' }}>Người Chơi</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán đúng kết quả trận đấu">Đoán KQ</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán chính xác tỷ số">Đoán TS</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán chính xác hiệu số">Đoán HS</th>
                      <th style={{ padding: '0 1rem', textAlign: 'right', color: '#fff', width: '80px' }}>Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((user, idx) => (
                      <tr key={user.id} className="hover-card" style={{ background: 'rgba(0,0,0,0.3)', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: '900', fontSize: '1.25rem', color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#6b7280', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                          <div className="flex flex-col items-center gap-1">
                            <span>#{idx + 1}</span>
                            {user.rankTrend > 0 && <span style={{ color: '#00ff88', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>▲ +{user.rankTrend}</span>}
                            {user.rankTrend < 0 && <span style={{ color: '#ff4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>▼ {user.rankTrend}</span>}
                            {user.rankTrend === 0 && <span style={{ color: '#888', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>⏺ -</span>}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.display_name}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#00d2ff', fontWeight: '600', fontSize: '1.1rem' }}>
                          {user.stats?.correctResults || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.totalPreds || 0}</span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#00ff88', fontWeight: '600', fontSize: '1.1rem' }}>
                          {user.stats?.exactScores || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.totalPreds || 0}</span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#fbbf24', fontWeight: '600', fontSize: '1.1rem' }}>
                          {user.stats?.exactDiffs || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.totalPreds || 0}</span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#00ff88', fontWeight: 'bold', fontSize: '1.4rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                          {user.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (() => {
              // Build Chart Data
              const datesMap = new Map();
              leaderboard.forEach(user => {
                user.rankHistory?.forEach((record: any) => {
                  if (!datesMap.has(record.date)) {
                    datesMap.set(record.date, { date: record.date });
                  }
                  datesMap.get(record.date)[user.display_name] = record.rank;
                });
              });
              const chartData = Array.from(datesMap.values());
              const maxRank = leaderboard.length;
              const colors = ['#ff9900', '#00d2ff', '#00ff88', '#fbbf24', '#ff4444', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6', '#10b981', '#3b82f6'];

              return (
                <div style={{ width: '100%', height: '500px', padding: '1rem 0' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fill: '#a3a3a3' }} tickMargin={10} />
                      <YAxis 
                        reversed 
                        domain={[1, maxRank]} 
                        ticks={Array.from({length: maxRank}, (_, i) => i + 1)}
                        stroke="#a3a3a3" 
                        tick={{ fill: '#a3a3a3' }}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      {leaderboard.map((user, idx) => (
                        <Line 
                          key={user.id}
                          type="monotone" 
                          dataKey={user.display_name} 
                          stroke={colors[idx % colors.length]} 
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
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

          const filteredMatches = matches.filter(m => {
            const matchRound = filterRound === 'All' || m.round === filterRound;
            
            const isFinished = m.status === 'finished';
            const isLive = m.status === 'live' || (!isFinished && new Date() >= new Date(m.kickoff_time));
            const isPending = !isFinished && !isLive;
            
            const kickoffTime = new Date(m.kickoff_time).getTime();
            const now = new Date().getTime();
            const diffHours = (kickoffTime - now) / (1000 * 60 * 60);

            const isUpcoming = isPending && diffHours <= 12;
            const isNotStarted = isPending && diffHours > 12;
            
            let matchStatus = true;
            if (filterStatus === 'finished') matchStatus = isFinished;
            if (filterStatus === 'live') matchStatus = isLive;
            if (filterStatus === 'upcoming') matchStatus = isUpcoming;
            if (filterStatus === 'not_started') matchStatus = isNotStarted;
            if (filterStatus === 'pending') matchStatus = isPending;
            
            return matchRound && matchStatus;
          });

          return (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 m-0">
                  <span style={{ color: 'var(--accent)' }}>●</span> Lịch Thi Đấu
                </h2>
                
                {matches.length > 0 && (
                  <div className="flex flex-row items-center gap-2 md:gap-3 w-full md:w-auto justify-center md:justify-end">
                    <div className="flex items-center gap-1 md:gap-2">
                      <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap text-gray-300 md:text-white">Trạng thái:</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#00d2ff] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-5 md:pr-10 w-[95px] md:min-w-[160px] md:w-auto"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.35rem top 50%',
                          backgroundSize: '0.5rem auto',
                        }}
                      >
                        <option value="All">Tất cả</option>
                        <option value="finished">Đã xong</option>
                        <option value="live">Đang diễn ra</option>
                        <option value="upcoming">Sắp diễn ra</option>
                        <option value="not_started">Chưa diễn ra</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                      <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap ml-1 md:ml-2 text-gray-300 md:text-white">Vòng:</label>
                      <select 
                        value={filterRound}
                        onChange={(e) => setFilterRound(e.target.value)}
                        className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#7a00ff] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-5 md:pr-10 w-[90px] md:min-w-[180px] md:w-auto"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.35rem top 50%',
                          backgroundSize: '0.5rem auto',
                        }}
                      >
                        <option value="All">Tất cả</option>
                        {uniqueRounds.map(r => (
                          <option key={r as string} value={r as string}>{r as string}</option>
                        ))}
                      </select>
                    </div>
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

                    const isFinished = match.status === 'finished';
                    const isLive = match.status === 'live' || (!isFinished && new Date() >= new Date(match.kickoff_time));
                    const isPending = !isFinished && !isLive;
                    
                    const kickoffTime = new Date(match.kickoff_time).getTime();
                    const now = new Date().getTime();
                    const diffHours = (kickoffTime - now) / (1000 * 60 * 60);
                    
                    const isUpcoming = isPending && diffHours <= 12;

                    const displayStatus = isFinished ? 'Đã xong' : isLive ? 'Đang diễn ra' : isUpcoming ? 'Sắp diễn ra' : 'Chưa diễn ra';
                    const badgeClass = isFinished ? 'badge-success' : isLive ? 'badge-danger' : isUpcoming ? 'badge-warning' : 'badge-secondary';
                    const hasPredicted = myPredictions.some(p => p.match_id === match.id);

                    return (
                    <Link href={`/match/${match.id}`} key={match.id}>
                      <div className="glass-panel hover-card" style={{ padding: '2rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        {isLive && (
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
                          <span className={`badge ${badgeClass}`}>
                            {isLive ? <span className="animate-pulse">{displayStatus}</span> : displayStatus}
                          </span>
                        </div>

                    <div className="flex justify-between items-center w-full px-1 md:px-6">
                      {/* Home Team */}
                      <div className="flex flex-col items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                        {home.flag ? 
                          <img src={home.flag} className="flag-icon" style={{ width: '60px', height: '45px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('hidden'); (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} /> 
                          : null
                        }
                        <div className="flag-icon flex items-center justify-center text-gray-400 font-bold" style={{ width: '60px', height: '45px', background: 'rgba(255,255,255,0.05)', fontSize: '1.2rem', display: home.flag ? 'none' : 'flex' }} hidden={home.flag ? true : undefined}>?</div>
                        <span className="text-center font-bold text-sm md:text-xl truncate w-full px-1">{home.name}</span>
                      </div>
                      
                      {/* Score / VS */}
                      <div className="flex flex-col items-center justify-center" style={{ flexShrink: 0, padding: '0 0.5rem' }}>
                        <div className="text-center" style={{ 
                          fontSize: match.status !== 'pending' ? '2.2rem' : '1.8rem', 
                          fontWeight: '900', 
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          letterSpacing: match.status !== 'pending' ? '-0.05em' : 'normal'
                        }}>
                          {match.status !== 'pending' ? `${match.home_score} - ${match.away_score}` : (isLive ? <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textTransform: 'uppercase', lineHeight: '1.2' }}>Kết quả đang<br/>được cập nhật</div> : 'VS')}
                        </div>
                        {match.status !== 'pending' && match.win_method && match.win_method !== '90_mins' && (
                          <div className="text-center mt-1" style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                            {match.win_method === 'extra_time' ? "(Hiệp phụ)" : `(Pen: ${match.penalty_home ?? '?'} - ${match.penalty_away ?? '?'})`}
                          </div>
                        )}
                        {match.status === 'pending' && !isLive && (
                          <div className="mt-1 font-bold text-center" style={{ fontSize: '0.75rem', color: hasPredicted ? 'var(--primary)' : 'var(--success)' }}>
                            {hasPredicted ? 'BẠN ĐÃ DỰ ĐOÁN' : 'DỰ ĐOÁN NGAY'}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex flex-col items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
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
