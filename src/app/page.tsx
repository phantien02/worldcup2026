"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

import Link from 'next/link';
import WorldCupStandings from '@/components/WorldCupStandings';
import TopScorers, { TopScorer } from '@/components/TopScorers';
import ProfileUpdateForm from '@/components/ProfileUpdateForm';
import { resolvePlaceholderTeam } from '@/utils/standings';
import matchMapping from '../data/matchMapping.json';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TournamentBracket from '@/components/TournamentBracket';

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
  globalIndex?: number;
  matchNumber?: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const isGuest = user?.email === 'guest@wc2026.local';
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'leaderboard' | 'rules' | 'profile'>('matches');
  const [standingsTab, setStandingsTab] = useState<'teams' | 'scorers'>('teams');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterRound, setFilterRound] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVote, setFilterVote] = useState('All');
  const [myPredictions, setMyPredictions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  
  // User Stats Modal State
  const [selectedUserStats, setSelectedUserStats] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [loadingUserStats, setLoadingUserStats] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleClick = () => setActiveTooltip(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleUserClick = async (userId: string) => {
    setIsUserModalOpen(true);
    setLoadingUserStats(true);
    try {
      const viewerId = user?.id || '';
      const res = await fetch(`/api/user-stats?userId=${userId}&viewerId=${viewerId}`);
      if (!res.ok) throw new Error('Failed to fetch user stats');
      const data = await res.json();
      setSelectedUserStats(data);
    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu người chơi.');
      setIsUserModalOpen(false);
    } finally {
      setLoadingUserStats(false);
    }
  };
  const [leaderboardView, setLeaderboardView] = useState<'list' | 'chart'>('list');
  const [chartType, setChartType] = useState<'rank' | 'points'>('rank');
  const [hiddenPlayers, setHiddenPlayers] = useState<string[]>([]);
  const [pointsFilter, setPointsFilter] = useState<'total' | 'group' | 'knockout'>('total');
  const [initializedChart, setInitializedChart] = useState(false);

  useEffect(() => {
    if (leaderboard.length > 0 && user && !initializedChart) {
      const others = leaderboard.filter(u => u.id !== user.id).map(u => u.display_name);
      setHiddenPlayers(others);
      setInitializedChart(true);
    }
  }, [leaderboard, user, initializedChart]);

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
        let validMatches = (matchesData as any).filter((m: any) => m.round !== 'DELETED');
        
        // Compute chronological global index FIRST for group stage fallback
        validMatches.sort((a: any, b: any) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
        
        validMatches = validMatches.map((m: any, index: number) => {
          let matchNum = index + 1; // Default chronological index
          if (m.home_team && m.away_team) {
             const tag = (matchMapping as any)[`${m.home_team.name} vs ${m.away_team.name}`];
             if (tag) {
                const parsed = parseInt(tag.replace(/\\D/g, ''));
                if (!isNaN(parsed)) matchNum = parsed;
             }
          }
          return { ...m, globalIndex: matchNum, matchNumber: matchNum }; 
        });
        
        // Sort by status (unfinished first, finished last)
        // For unfinished matches: chronological order (soonest first)
        // For finished matches: reverse chronological order (most recently finished first)
        validMatches.sort((a: any, b: any) => {
          const aFinished = a.status === 'finished';
          const bFinished = b.status === 'finished';
          if (aFinished && !bFinished) return 1;
          if (!aFinished && bFinished) return -1;
          
          const timeA = new Date(a.kickoff_time).getTime();
          const timeB = new Date(b.kickoff_time).getTime();
          
          if (aFinished && bFinished) {
            return timeB - timeA; // Most recent first
          }
          return timeA - timeB; // Soonest first
        });
        
        setMatches(validMatches);
      }
      
      // Fetch Top Scorers
      const { data: topScorersData } = await supabase
        .from('top_scorers')
        .select('*')
        .order('goals', { ascending: false })
        .order('assists', { ascending: false });
        
      if (topScorersData) {
        setTopScorers(topScorersData);
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
        <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '3rem', borderRadius: '16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}>
          <h1 className="logo mb-6 text-center text-5xl md:text-7xl" style={{ lineHeight: 1.1 }}>
            Dự Đoán World Cup 2026
          </h1>
          <p className="text-center mb-10" style={{ fontSize: '1.25rem', color: '#e5e5e5', maxWidth: '700px', lineHeight: 1.6 }}>
            Hòa mình vào không khí sôi động của World Cup 2026. Thể hiện tài dự đoán thiên bẩm, leo top bảng xếp hạng và giành lấy vinh quang!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
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
      </div>
    );
  }

  return (
    <>
    <div 
      className="flex flex-col gap-12 mt-8 pb-16 transition-all duration-300"
      style={{ 
        filter: isUserModalOpen ? 'blur(8px)' : 'none',
        opacity: isUserModalOpen ? 0.6 : 1,
        pointerEvents: isUserModalOpen ? 'none' : 'auto'
      }}
    >
      {/* Hero Section */}
      <div className="text-center animate-fade-in glass-panel mx-auto" style={{ padding: '2.5rem 2rem', maxWidth: '900px', width: '90%', marginBottom: '1.5rem', marginTop: '1rem' }}>
        <h1 className="logo mb-4 text-4xl md:text-6xl" style={{ lineHeight: 1.3 }}>
          Dự Đoán World Cup 2026
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#e5e5e5', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
          Chào mừng trở lại, <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>{isGuest ? 'Khách Tham Quan' : user.user_metadata?.display_name}</span>! Hãy bắt đầu dự đoán các trận đấu bên dưới.
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
          <div className="w-full max-w-5xl flex flex-col gap-6 animate-fade-in">
            {/* Sub-tabs for Standings */}
            <div className="flex justify-center mb-6">
              <div className="glass-panel" style={{ padding: '0.4rem', borderRadius: '50px', display: 'flex', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => setStandingsTab('teams')}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: standingsTab === 'teams' ? 'var(--primary)' : 'transparent',
                    color: standingsTab === 'teams' ? '#000' : '#a0a0a0',
                    boxShadow: standingsTab === 'teams' ? '0 0 15px rgba(0,210,255,0.4)' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Đội Tuyển
                </button>
                <button
                  onClick={() => setStandingsTab('scorers')}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: standingsTab === 'scorers' ? 'var(--primary)' : 'transparent',
                    color: standingsTab === 'scorers' ? '#000' : '#a0a0a0',
                    boxShadow: standingsTab === 'scorers' ? '0 0 15px rgba(0,210,255,0.4)' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Vua Phá Lưới
                </button>
              </div>
            </div>

            {standingsTab === 'teams' ? (
              <WorldCupStandings matches={matches} />
            ) : (
              <TopScorers scorers={topScorers} matches={matches} />
            )}
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
                Người chơi thực hiện dự đoán theo 2 phần chính: <strong>dự đoán kết quả</strong> và <strong>dự đoán tỷ số</strong>.
              </p>

              <div>
                <h3 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>1. Dự đoán kết quả trận đấu</h3>
                <p className="mb-2">Người chơi chọn một trong ba kết quả: Đội nhà thắng, Hòa hoặc Đội khách thắng.</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Dự đoán đúng kết quả trận đấu: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  <li>Dự đoán sai kết quả trận đấu: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>2. Dự đoán tỷ số (không bắt buộc)</h3>
                <p className="mb-2">Người chơi có thể dự đoán tỷ số cụ thể của trận đấu để nhận thêm điểm thưởng tỷ số và điểm phụ.</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><span className="text-yellow-400 font-bold">[Thưởng Điểm Phụ Độc Lập]</span> Đoán đúng số bàn thắng của Đội nhà: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                  <li><span className="text-yellow-400 font-bold">[Thưởng Điểm Phụ Độc Lập]</span> Đoán đúng số bàn thắng của Đội khách: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                  <li><span style={{ color: '#a3a3a3', fontStyle: 'italic', fontSize: '0.9rem' }}>(Lưu ý: Điểm phụ vẫn được cộng kể cả khi bạn đoán sai kết quả trận đấu)</span></li>
                  <li className="mt-2"><span className="text-blue-400 font-bold">[Thưởng Kép nếu Đoán Đúng Kết Quả Trận]</span> Đoán đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+3 điểm</strong></li>
                  <li><span className="text-blue-400 font-bold">[Thưởng Kép nếu Đoán Đúng Kết Quả Trận]</span> Đoán sai tỷ số nhưng đúng hiệu số: <strong style={{ color: '#ffcc00' }}>+1 điểm</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>3. Điểm mạo hiểm (Underdog Bonus)</h3>
                <p className="mb-2">Phần thưởng đặc biệt dành cho những người chơi có lối đi riêng.</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Nếu kết quả bạn chọn (Thắng/Thua/Hòa) có <strong>từ 20% trở xuống (&lt;= 20%)</strong> số người chơi trên toàn hệ thống lựa chọn, bạn được thưởng thêm: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-bold text-white text-center text-lg mb-0">
                  Tổng điểm nhận được = <span style={{ color: '#00d2ff' }}>Điểm kết quả</span> + <span style={{ color: '#00d2ff' }}>Điểm tỷ số/phụ</span> + <span style={{ color: '#00d2ff' }}>Điểm mạo hiểm</span>
                </p>
              </div>

              <h3 className="font-bold text-white text-2xl mt-4 mb-2 text-center" style={{ color: '#ff9900' }}>Ví dụ minh họa (Vòng Bảng)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00ff87' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 1: Đúng tuyệt đối + mạo hiểm (≤ 20%)</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 2-1 Đội B (cửa thắng chỉ có 12% chọn)</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn Đội A: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Đúng số bàn Đội B: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+3 điểm</strong></li>
                    <li>Điểm mạo hiểm: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00ff87', fontSize: '1.125rem' }}>15 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00d2ff' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 2: Đúng tuyệt đối (Không mạo hiểm)</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 2-1 Đội B</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn Đội A: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Đúng số bàn Đội B: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+3 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00d2ff', fontSize: '1.125rem' }}>10 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 3: Đúng kết quả, mạo hiểm, sai tỷ số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 3-1 Đội B (cửa này có 12% vote)</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn của 1 đội (ở đây là Đội B): <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Điểm mạo hiểm: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#3b82f6', fontSize: '1.125rem' }}>11 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #a855f7' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 4: Đúng kết quả, đúng hiệu số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Đội A thắng 3-2 Đội B</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng kết quả: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng hiệu số (+1): <strong style={{ color: '#ffcc00' }}>+1 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#a855f7', fontSize: '1.125rem' }}>6 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ffcc00' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 5: Sai kết quả nhưng vớt điểm phụ</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Hòa 1-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai kết quả: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                    <li>Đúng số bàn của 1 đội (ở đây là Đội B): <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ffcc00', fontSize: '1.125rem' }}>1 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ff004c' }}>
                  <h4 className="font-bold text-white text-lg mb-2">Trường hợp 6: Sai hoàn toàn</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Đội A thắng 2-1 Đội B</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: Hòa 0-0</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai kết quả: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                    <li>Không trúng điểm phụ nào: <strong style={{ color: '#6b7280' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ff004c', fontSize: '1.125rem' }}>0 điểm</span></div>
                </div>
              </div>

              <h3 className="font-bold text-white text-2xl mt-8 mb-2 border-b border-gray-700 pb-2" style={{ color: '#ff9900' }}>II. Các Trận Loại Trực Tiếp (Knock-out)</h3>
              <p>
                Người chơi dự đoán <strong>Đội đi tiếp</strong> và <strong>Tỷ số trong 120 phút</strong> (hai phần này hoàn toàn ĐỘC LẬP với nhau).
              </p>
              
              <div>
                <h4 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>1. Dự đoán Đội đi tiếp</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Đoán trúng đội đi tiếp / chiến thắng: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                  <li>Nếu đội bạn dự đoán đi tiếp có <strong>từ 20% trở xuống (&lt;= 20%)</strong> số người chơi lựa chọn, bạn được thưởng thêm điểm mạo hiểm: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-xl mb-3" style={{ color: '#00d2ff' }}>2. Dự đoán Tỷ số trong 120 phút</h4>
                <p className="mb-2">Người chơi dự đoán kết quả tỷ số sau 90 phút (và 30 phút hiệp phụ nếu có). <strong>KHÔNG</strong> tính bàn thắng của loạt sút luân lưu (Penalty).</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><span className="text-yellow-400 font-bold">[Thưởng Điểm Phụ]</span> Đoán đúng số bàn thắng của Đội nhà: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                  <li><span className="text-yellow-400 font-bold">[Thưởng Điểm Phụ]</span> Đoán đúng số bàn thắng của Đội khách: <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                  <li className="mt-2"><span className="text-blue-400 font-bold">[Thưởng Lớn]</span> Đoán đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                  <li><span className="text-blue-400 font-bold">[Thưởng Vớt]</span> Đoán sai tỷ số nhưng đúng hiệu số bàn thắng: <strong style={{ color: '#ffcc00' }}>+1 điểm</strong></li>
                  <li><span style={{ color: '#a3a3a3', fontStyle: 'italic', fontSize: '0.9rem' }}>(Phần dự đoán tỷ số 120 phút được tính điểm riêng biệt, kể cả khi bạn đoán sai đội đi tiếp vẫn được cộng điểm phần này!)</span></li>
                </ul>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-bold text-white text-center text-lg mb-0">
                  Tổng điểm tối đa cho mỗi trận Knock-out = <span style={{ color: '#00ff87' }}>27 điểm</span> (Đội đi tiếp: 20đ + Tỷ số: 7đ)
                </p>
              </div>

              <h3 className="font-bold text-white text-2xl mt-4 mb-2 text-center" style={{ color: '#ff9900' }}>Ví dụ minh họa (Knock-out)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #00ff87' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH1: Hoàn hảo (Trúng Jackpot)</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 2-1 (120 phút)</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: A đi tiếp (mạo hiểm), tỷ số 2-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Điểm mạo hiểm (≤ 20%): <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Đúng chính xác tỷ số: <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn 2 đội (1+1): <strong style={{ color: '#00ff87' }}>+2 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#00ff87', fontSize: '1.125rem' }}>27 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #22d3ee' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH2: Đúng đội, Phóc tỷ số hoà</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Hoà 1-1, A thắng luân lưu</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: A đi tiếp (ko mạo hiểm), tỷ số 1-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Điểm mạo hiểm: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Đúng chính xác tỷ số (1-1): <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn 2 đội (1+1): <strong style={{ color: '#00ff87' }}>+2 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#22d3ee', fontSize: '1.125rem' }}>17 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH3: Đúng đội, Sai TS, Đúng hiệu số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 2-0</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: A đi tiếp, tỷ số 3-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Sai chính xác tỷ số: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Đúng hiệu số (+2 bàn): <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Sai số bàn từng đội: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#f59e0b', fontSize: '1.125rem' }}>11 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #a855f7' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH4: Đúng đội, Trúng bàn 1 đội</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 3-1</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: A đi tiếp, tỷ số 2-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Sai tỷ số, sai hiệu số: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Đúng số bàn Đội B (1 bàn): <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Sai số bàn Đội A: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#a855f7', fontSize: '1.125rem' }}>11 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ec4899' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH5: Đúng đội, Sai sạch tỷ số</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 3-0</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: A đi tiếp, tỷ số 2-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Đúng đội đi tiếp: <strong style={{ color: '#00ff87' }}>+10 điểm</strong></li>
                    <li>Sai tỷ số, sai hiệu số: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Sai bàn Đội A & Đội B: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ec4899', fontSize: '1.125rem' }}>10 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH6: Sai đội (Vớt vát tỷ số)</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: Hoà 1-1, A thắng luân lưu</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: B đi tiếp, tỷ số 1-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai đội đi tiếp: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Đúng chính xác tỷ số (1-1): <strong style={{ color: '#00ff87' }}>+5 điểm</strong></li>
                    <li>Đúng số bàn 2 đội (1+1): <strong style={{ color: '#00ff87' }}>+2 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#ef4444', fontSize: '1.125rem' }}>7 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #94a3b8' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH7: Sai đội, Trúng 1 bàn (An ủi)</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 2-1</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: B đi tiếp, tỷ số 0-1</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai đội đi tiếp: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Sai tỷ số, sai hiệu số: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Đúng số bàn Đội B (1 bàn): <strong style={{ color: '#00ff87' }}>+1 điểm</strong></li>
                    <li>Sai số bàn Đội A: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#94a3b8', fontSize: '1.125rem' }}>1 điểm</span></div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #475569' }}>
                  <h4 className="font-bold text-white text-lg mb-2">TH8: Trắng tay toàn tập</h4>
                  <p className="text-sm mb-1" style={{ color: '#a3a3a3' }}>Thực tế: A thắng B 2-0</p>
                  <p className="text-sm mb-3" style={{ color: '#a3a3a3' }}>Dự đoán: B đi tiếp, tỷ số 1-2</p>
                  <ul className="text-sm space-y-1">
                    <li>Sai đội đi tiếp: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Sai tỷ số, sai hiệu số: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                    <li>Sai bàn Đội A & Đội B: <strong style={{ color: '#ff004c' }}>+0 điểm</strong></li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 font-bold text-white">Tổng cộng: <span style={{ color: '#475569', fontSize: '1.125rem' }}>0 điểm</span></div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in mx-auto pb-16">
          <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 justify-center mb-6">
            <span style={{ color: '#ff9900' }}>●</span> BXH Người Chơi
          </h2>
          
          <div className="flex flex-col justify-center items-center gap-6 mb-8 w-full">
            <div className="flex items-center gap-3">
              <label className="text-[14px] md:text-[1.2rem] font-bold whitespace-nowrap text-gray-300 md:text-white">Giao diện:</label>
              <select 
                value={leaderboardView}
                onChange={(e) => setLeaderboardView(e.target.value as 'list' | 'chart')}
                className="bg-[#0a0a0a] text-white font-bold border-2 border-orange-500 rounded-xl outline-none cursor-pointer appearance-none text-[14px] md:text-[1.2rem] py-2 pl-4 md:py-3 md:pl-6 w-auto max-w-full"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem top 50%',
                  backgroundSize: '0.8rem auto',
                  paddingRight: '3.5rem',
                }}
              >
                <option value="list">📋 Dạng Danh Sách</option>
                <option value="chart">📈 Dạng Biểu Đồ</option>
              </select>
            </div>
            
            {leaderboardView === 'chart' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', width: '100%', marginTop: '12px' }}>
                <button
                  onClick={() => setChartType('rank')}
                  style={{
                    backgroundColor: chartType === 'rank' ? '#2563eb' : '#374151',
                    color: chartType === 'rank' ? '#ffffff' : '#d1d5db',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: chartType === 'rank' ? '2px solid #60a5fa' : '2px solid #4b5563',
                    transition: 'all 0.2s ease',
                    boxShadow: chartType === 'rank' ? '0 4px 12px rgba(37,99,235,0.5)' : '0 2px 4px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                  }}
                >
                  🏆 Thứ hạng
                </button>
                <button
                  onClick={() => setChartType('points')}
                  style={{
                    backgroundColor: chartType === 'points' ? '#2563eb' : '#374151',
                    color: chartType === 'points' ? '#ffffff' : '#d1d5db',
                    padding: '12px 28px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: chartType === 'points' ? '2px solid #60a5fa' : '2px solid #4b5563',
                    transition: 'all 0.2s ease',
                    boxShadow: chartType === 'points' ? '0 4px 12px rgba(37,99,235,0.5)' : '0 2px 4px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                  }}
                >
                  ⭐️ Điểm số
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            {leaderboard.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem 0', opacity: 0.5 }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                Chưa có ai ghi điểm. Hãy là người đầu tiên!
              </div>
            ) : leaderboardView === 'list' ? (
              <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {/* Points Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {([
                    { key: 'total', label: '🏆 Điểm tổng' },
                    { key: 'group', label: '🔵 Vòng bảng' },
                    { key: 'knockout', label: '⚡ Vòng loại' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPointsFilter(key)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        backgroundColor: pointsFilter === key ? '#2563eb' : 'rgba(255,255,255,0.08)',
                        color: pointsFilter === key ? '#fff' : '#9ca3af',
                        boxShadow: pointsFilter === key ? '0 2px 12px rgba(37,99,235,0.4)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Leaderboard Table */}
                {(() => {
                  const getPoints = (u: any) => pointsFilter === 'total' ? (u.calculatedTotalPoints || 0) : pointsFilter === 'group' ? (u.groupPoints || 0) : (u.knockoutPoints || 0);
                  const sorted = [...leaderboard].sort((a, b) => {
                    const diff = getPoints(b) - getPoints(a);
                    if (diff !== 0) return diff;
                    const scoreDiff = (b.stats?.exactScores || 0) - (a.stats?.exactScores || 0);
                    if (scoreDiff !== 0) return scoreDiff;
                    const diffDiff = (b.stats?.exactDiffs || 0) - (a.stats?.exactDiffs || 0);
                    if (diffDiff !== 0) return diffDiff;
                    return (a.display_name || '').localeCompare(b.display_name || '');
                  });
                  return (
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px', fontSize: '0.95rem', textAlign: 'left', minWidth: '700px' }}>
                  <thead style={{ color: '#a3a3a3', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    <tr>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '80px' }}>Hạng</th>
                      <th style={{ padding: '0 1rem' }}>Người Chơi</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', color: '#fff', width: '80px' }}>Điểm</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '120px' }} title="Số trận người chơi đã đoán / tổng số trận đã kết thúc">Số Trận Dự Đoán</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán đúng kết quả trận đấu">Đoán KQ</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán chính xác tỷ số">Đoán TS</th>
                      <th style={{ padding: '0 1rem', textAlign: 'center', width: '100px' }} title="Dự đoán chính xác hiệu số">Đoán HS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((user, idx) => (
                      <tr key={user.id} className="hover-card" style={{ background: 'rgba(0,0,0,0.3)', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: '900', fontSize: '1.25rem', color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#6b7280', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                          <div className="flex flex-col items-center gap-1">
                            <span>#{idx + 1}</span>
                            {pointsFilter === 'total' && user.rankTrend > 0 && <span style={{ color: '#00ff88', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>▲ {user.rankTrend}</span>}
                            {pointsFilter === 'total' && user.rankTrend < 0 && <span style={{ color: '#ff4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>▼ {Math.abs(user.rankTrend)}</span>}
                            {pointsFilter === 'total' && user.rankTrend === 0 && <span style={{ color: '#888', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>⏺ 0</span>}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                          <div className="player-name-container">
                            <span 
                              className="player-name-text hover:text-[#00d2ff] underline decoration-white/30 hover:decoration-[#00d2ff] transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUserClick(user.id);
                              }}
                              title="Xem chi tiết điểm số"
                            >
                              {user.display_name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#00ff88', fontWeight: '900', fontSize: '1.25rem' }}>
                          {getPoints(user)}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#a3a3a3', fontWeight: '600', fontSize: '1.1rem' }}>
                          {pointsFilter === 'total'
                            ? <>{user.stats?.actualPreds || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.totalPreds || 0}</span></>
                            : pointsFilter === 'group'
                            ? <>{user.stats?.groupActualPreds || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.groupMatchCount || 0}</span></>
                            : <>{user.stats?.knockoutActualPreds || 0}<span style={{ opacity: 0.4, fontSize: '0.85rem', fontWeight: 'normal' }}>/{user.stats?.knockoutMatchCount || 0}</span></>
                          }
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#00d2ff', fontWeight: '600', fontSize: '1.1rem' }}>
                          {user.stats?.correctResults || 0}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#00ff88', fontWeight: '600', fontSize: '1.1rem' }}>
                          {user.stats?.exactScores || 0}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: '#fbbf24', fontWeight: '600', fontSize: '1.1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                          {user.stats?.exactDiffs || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  );
                })()}
              </div>
            ) : (() => {
              // Build Chart Data
              const datesMap = new Map();
              leaderboard.forEach(user => {
                const historyArray = chartType === 'rank' ? user.rankHistory : user.pointsHistory;
                historyArray?.forEach((record: any) => {
                  if (!datesMap.has(record.date)) {
                    datesMap.set(record.date, { 
                      date: record.date,
                      homeFlag: record.homeFlag,
                      awayFlag: record.awayFlag,
                      homeName: record.homeName,
                      awayName: record.awayName 
                    });
                  }
                  datesMap.get(record.date)[user.display_name] = chartType === 'rank' ? record.rank : record.points;
                });
              });
              const chartData = Array.from(datesMap.values());
              const maxRank = leaderboard.length;
              const colors = ['#ff9900', '#00d2ff', '#00ff88', '#fbbf24', '#ff4444', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6', '#10b981', '#3b82f6'];

              // Sorted players alphabetically for the legend
              const sortedPlayers = [...leaderboard].sort((a, b) => a.display_name.localeCompare(b.display_name));

              const togglePlayer = (name: string) => {
                setHiddenPlayers(prev => 
                  prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
                );
              };

              const CustomTooltip = ({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const matchData = chartData.find((d: any) => d.date === label);
                  return (
                    <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                      {chartType === 'points' && matchData?.homeFlag && matchData?.awayFlag ? (
                        <div className="flex flex-col mb-3 pb-3 border-b border-white/10">
                          <div className="text-gray-400 text-[11px] font-bold uppercase tracking-widest text-center mb-2">{label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                            <div style={{ width: '16px', height: '11px', backgroundImage: `url(${matchData.homeFlag})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '2px', flexShrink: 0 }} />
                            <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{matchData.homeName}</span>
                            <span style={{ color: '#22d3ee', fontSize: '9px', fontWeight: 900, fontStyle: 'italic', margin: '0 2px', opacity: 0.8 }}>VS</span>
                            <span style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{matchData.awayName}</span>
                            <div style={{ width: '16px', height: '11px', backgroundImage: `url(${matchData.awayFlag})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '2px', flexShrink: 0 }} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-2 pb-2 border-b border-white/10 text-center">
                          {label}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1.5 mt-1">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex justify-between items-center gap-8 ml-1 mr-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full opacity-80" style={{ backgroundColor: entry.color }}></div>
                              <span className="text-gray-300 text-[13px] font-medium">{entry.name}</span>
                            </div>
                            <span style={{ color: entry.color }} className="text-[13px] font-black">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              };

              const ChartComponent = chartType === 'rank' ? LineChart : BarChart;

              return (
                <div className="flex flex-col md:flex-row gap-6 w-full" style={{ minHeight: '500px', padding: '1rem 0' }}>
                  {/* Left Column: Chart */}
                  <div className="flex-1" style={{ height: '500px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ChartComponent key={chartType} data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fill: '#a3a3a3' }} tickMargin={10} minTickGap={20} />
                        <YAxis 
                          reversed={chartType === 'rank'} 
                          domain={chartType === 'rank' ? [1, maxRank] : ['auto', 'auto']} 
                          ticks={chartType === 'rank' ? Array.from({length: maxRank}, (_, i) => i + 1) : undefined}
                          stroke="#a3a3a3" 
                          tick={{ fill: '#a3a3a3' }}
                          width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {leaderboard.map((user, idx) => {
                          if (hiddenPlayers.includes(user.display_name)) return null;
                          const color = colors[leaderboard.findIndex(u => u.id === user.id) % colors.length];
                          
                          return chartType === 'rank' ? (
                            <Line 
                              key={user.id}
                              type="linear" 
                              dataKey={user.display_name} 
                              stroke={color}
                              strokeWidth={3}
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              isAnimationActive={true}
                            />
                          ) : (
                            <Bar 
                              key={user.id}
                              dataKey={user.display_name} 
                              fill={color}
                              isAnimationActive={true}
                              radius={[4, 4, 0, 0] as any}
                            />
                          );
                        })}
                      </ChartComponent>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Right Column: Legend */}
                  <div className="w-full md:w-[450px] flex flex-col gap-2 p-4 bg-black/40 rounded-xl border border-white/10" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div className="flex justify-between items-end mb-2 border-b border-white/10 pb-2">
                      <div className="text-sm font-bold text-gray-400 uppercase">
                        Người chơi
                      </div>
                      <div className="flex gap-2 text-[10px] md:text-[11px] font-bold">
                        <button 
                          onClick={() => setHiddenPlayers([])} 
                          style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #3b82f6', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                        >
                          Chọn tất cả
                        </button>
                        <button 
                          onClick={() => setHiddenPlayers(leaderboard.map(u => u.display_name))} 
                          style={{ backgroundColor: '#374151', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #4b5563', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {sortedPlayers.map((user) => {
                      const isHidden = hiddenPlayers.includes(user.display_name);
                      const userColor = colors[leaderboard.findIndex(u => u.id === user.id) % colors.length];
                      return (
                        <div 
                          key={user.id} 
                          onClick={() => togglePlayer(user.display_name)}
                          className="flex items-center p-1.5 md:p-2 rounded-lg cursor-pointer transition-all hover:bg-white/5"
                          style={{ opacity: isHidden ? 0.4 : 1 }}
                        >
                          <div 
                            className="flex-shrink-0"
                            style={{ 
                              width: '14px', 
                              height: '14px', 
                              borderRadius: '3px', 
                              backgroundColor: isHidden ? 'transparent' : userColor,
                              border: '2px solid ' + userColor,
                              marginRight: '10px'
                            }} 
                          >
                            {!isHidden && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.8))' }}>
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-white truncate">
                            {user.display_name}
                          </span>
                        </div>
                      );
                    })}
                    </div>
                  </div>
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
            
            let voteStatusMatch = true;
            if (!isGuest) {
              const isVoted = myPredictions.some(p => p.match_id === m.id);
              if (filterVote === 'voted') voteStatusMatch = isVoted;
              if (filterVote === 'unvoted') voteStatusMatch = !isVoted;
            }
            
            return matchRound && matchStatus && voteStatusMatch;
          });

          return (
            <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2 m-0">
                  <span style={{ color: 'var(--accent)' }}>●</span> Lịch Thi Đấu
                </h2>
                
                {matches.length > 0 && (
                  <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-center md:justify-end">
                    {!isGuest && (
                      <div className="flex items-center gap-1 md:gap-2">
                        <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap text-gray-300 md:text-white">Bình chọn:</label>
                        <select 
                          value={filterVote}
                          onChange={(e) => setFilterVote(e.target.value)}
                          className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#a855f7] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-10 md:pr-16 w-auto max-w-full"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem top 50%',
                            backgroundSize: '0.65rem auto',
                          }}
                        >
                          <option value="All">Tất cả</option>
                          <option value="voted">Đã chọn</option>
                          <option value="unvoted">Chưa chọn</option>
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-1 md:gap-2">
                      <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap text-gray-300 md:text-white">Trạng thái:</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#00d2ff] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-10 md:pr-16 w-auto max-w-full"
                        style={{
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem top 50%',
                          backgroundSize: '0.65rem auto',
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

                    <div className="flex items-center gap-1 md:gap-2">
                      <label className="text-[11px] md:text-[1.1rem] font-bold whitespace-nowrap ml-1 md:ml-2 text-gray-300 md:text-white">Xem nhánh đấu:</label>
                      <select 
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as 'list' | 'bracket')}
                        className="bg-[#0a0a0a] text-white font-bold border md:border-2 border-[#ff9900] rounded-lg md:rounded-xl outline-none cursor-pointer appearance-none text-[11px] md:text-[1.1rem] py-1.5 px-2 md:py-3 md:px-6 pr-5 md:pr-10 w-[90px] md:min-w-[120px] md:w-auto"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.35rem top 50%',
                          backgroundSize: '0.5rem auto',
                        }}
                      >
                        <option value="list">Danh sách</option>
                        <option value="bracket">Nhánh đấu</option>
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
                ) : viewMode === 'bracket' ? (
                  <TournamentBracket matches={matches} />
                ) : (
                  filteredMatches.map((match) => {
                    const globalIndex = match.globalIndex || 1;
                    
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
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
                          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', color: '#00d2ff', fontSize: '0.9rem', textTransform: 'uppercase', position: 'relative', zIndex: 10 }}>
                            {(matchMapping as any)[`${home.name} vs ${away.name}`] || `TRẬN ${globalIndex}`}
                          </span>
                          
                          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', transform: 'translateY(-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 1 }}>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {new Date(match.kickoff_time).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <span className={`badge ${badgeClass}`} style={{ position: 'relative', zIndex: 10 }}>
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

      {/* User Stats Modal */}
      {isUserModalOpen && mounted && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }} onClick={() => setIsUserModalOpen(false)}>
          <div className="glass-panel animate-scale-in" style={{ backgroundColor: '#161b22', width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            
            {loadingUserStats ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-[#00d2ff] border-t-transparent rounded-full animate-spin"></div>
                <div className="mt-4 text-gray-400 font-semibold">Đang tải dữ liệu...</div>
              </div>
            ) : selectedUserStats ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: 0, display: 'flex', alignItems: 'center' }}>
                      Thông tin dự đoán của người chơi <span style={{ fontSize: '0.875rem', color: '#a3a3a3', fontWeight: 'normal', marginLeft: '0.5rem' }}>({selectedUserStats.display_name})</span>
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => setIsUserModalOpen(false)}
                      style={{ background: 'transparent', border: 'none', color: '#a3a3a3', fontSize: '1.25rem', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="custom-scrollbar" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, marginTop: '0.5rem' }}>
                  {selectedUserStats.matchHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Người chơi này chưa có dự đoán nào.</div>
                  ) : (
                    <div className="w-full min-w-[700px]">
                      <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.6)', color: '#a3a3a3', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <tr>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', width: '60px', textAlign: 'center' }}>STT</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CẶP ĐẤU</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>THỜI GIAN ĐÁ</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>KẾT QUẢ THỰC TẾ</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>DỰ ĐOÁN</th>
                            <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ĐIỂM SỐ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserStats.matchHistory.map((pred: any, idx: number) => {
                            const date = new Date(pred.kickoff_time);
                            const dateStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                            
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#6b7280', fontWeight: 'bold' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                  <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>
                                    {pred.home_team} <span style={{ color: '#6b7280', fontWeight: 'normal', margin: '0 0.5rem' }}>vs</span> {pred.away_team}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#22d3ee', marginTop: '0.25rem' }}>
                                    {pred.match_round}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                                  {dateStr}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                  {pred.match_status === 'finished' ? (
                                    <div style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '1.125rem', letterSpacing: '0.1em' }}>
                                      {pred.match_home_score} - {pred.match_away_score}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Chưa đá</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                  <div style={{ 
                                    color: pred.is_hidden ? '#a3a3a3' : pred.is_missing ? '#6b7280' : (pred.match_status === 'finished' ? 
                                      (pred.predicted_home_score === pred.match_home_score && pred.predicted_away_score === pred.match_away_score ? '#00d2ff' : '#ff004c') 
                                      : '#00d2ff'), 
                                    fontWeight: 'bold', 
                                    fontSize: pred.is_hidden || pred.is_missing ? '0.9rem' : '1.125rem', 
                                    letterSpacing: pred.is_hidden || pred.is_missing ? 'normal' : '0.1em' 
                                  }}>
                                    {pred.is_hidden ? '🔒 BẢO MẬT' : pred.is_missing ? 'Không dự đoán' : `${pred.predicted_home_score} - ${pred.predicted_away_score}`}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center', position: 'relative' }}>
                                  {pred.match_status === 'finished' || pred.is_missing ? (
                                    <div 
                                      className="inline-block relative"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTooltip(activeTooltip === idx ? null : idx);
                                      }}
                                      onMouseEnter={() => window.innerWidth >= 768 && setActiveTooltip(idx)}
                                      onMouseLeave={() => window.innerWidth >= 768 && setActiveTooltip(null)}
                                    >
                                      <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: pred.points_earned > 0 ? '#10b981' : '#6b7280', cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.3)' }}>
                                        +{pred.points_earned}
                                      </span>
                                      
                                      {activeTooltip === idx && pred.breakdown && pred.breakdown.length > 0 && (
                                        <div style={{
                                          position: 'absolute',
                                          right: '100%',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          marginRight: '12px',
                                          backgroundColor: '#1f2937',
                                          color: 'white',
                                          padding: '1rem',
                                          borderRadius: '8px',
                                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                                          border: '1px solid #374151',
                                          zIndex: 50,
                                          minWidth: '220px',
                                          textAlign: 'left',
                                          fontSize: '0.875rem',
                                          pointerEvents: 'none',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#00d2ff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Chi tiết điểm:</div>
                                          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {pred.breakdown.map((item: string, i: number) => {
                                              const parts = item.split(':');
                                              if (parts.length < 2) return <li key={i}>{item}</li>;
                                              const label = parts[0].trim();
                                              const val = parts[1].trim();
                                              const isBonus = label.includes('mạo hiểm');
                                              const isZero = val === '0';
                                              const color = isBonus ? '#ff9900' : isZero ? '#6b7280' : '#00ff87';
                                              return (
                                                <li key={i} style={{ color, display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                                  <span>{label}</span>
                                                  <strong>{val}</strong>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#4b5563', fontWeight: 'bold' }}>-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400">Không có dữ liệu.</div>
            )}
          </div>
        </div>
      , document.getElementById('portal-root') || document.body)}
    </>
  );
}
