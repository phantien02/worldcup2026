"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { updateMatchResult, createMatch, createTeam, getPasswordRequests, resetUserPassword, getAllUsers, deleteUserAccount, deleteMatchAdmin } from './actions';
import matchMapping from '@/data/matchMapping.json';

type Team = { id: string; name: string; flag_url?: string; code?: string };
type Match = { id: string; home_team: Team; away_team: Team; status: string; home_score: number; away_score: number; kickoff_time: string; round?: string; home_team_id: string; away_team_id: string };
type UserProfile = { id: string; display_name: string; total_points: number; created_at: string };

export default function AdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // States cho form Tạo Đội
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamFlag, setNewTeamFlag] = useState('');
  
  // States cho form Tạo Trận
  const [newMatchHome, setNewMatchHome] = useState('');
  const [newMatchAway, setNewMatchAway] = useState('');
  const [newMatchTime, setNewMatchTime] = useState('');
  const [newMatchRound, setNewMatchRound] = useState('Vòng Bảng');

  const [pwdRequests, setPwdRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPredictions, setUserPredictions] = useState<any[]>([]);

  const [selectedMatchForPredictions, setSelectedMatchForPredictions] = useState<any>(null);
  const [matchPredictionsList, setMatchPredictionsList] = useState<any[]>([]);
  const [isPredictionsModalOpen, setIsPredictionsModalOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  async function fetchData() {
    const { data: teamsData } = await supabase.from('teams').select('*').order('name');
    if (teamsData) setTeams(teamsData as any);

    const { data: matchesData } = await supabase.from('matches').select('id, status, home_score, away_score, kickoff_time, round, home_team:home_team_id(name, flag_url, code), away_team:away_team_id(name, flag_url, code)').order('kickoff_time', { ascending: true });
    if (matchesData) {
      const validMatches = (matchesData as any).filter((m: any) => m.round !== 'DELETED');
      validMatches.sort((a: any, b: any) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
      setMatches(validMatches);
    }
    
    try {
      const reqs = await getPasswordRequests();
      setPwdRequests(reqs);
      
      const users = await getAllUsers();
      setAllUsers(users);
    } catch(err) { console.error("Lỗi tải dữ liệu", err); }
  }

  const [activeTab, setActiveTab] = useState<'results' | 'passwords' | 'users'>('results');
  
  const [updatingMatch, setUpdatingMatch] = useState<any>(null);
  const [adminResult, setAdminResult] = useState({
    homeScore: 0,
    awayScore: 0,
    winMethod: '90_mins' as '90_mins' | 'extra_time' | 'penalties',
    advancingTeamId: '',
    score90Home: 0,
    score90Away: 0,
    penaltyHome: 0,
    penaltyAway: 0
  });
  const [adminError, setAdminError] = useState('');

  const handleUpdateResult = async (
    matchId: string, 
    homeScore: number, 
    awayScore: number,
    isKnockout: boolean = false,
    winnerId?: string,
    winMethod?: '90_mins' | 'extra_time' | 'penalties',
    score90Home?: number,
    score90Away?: number,
    penaltyHome?: number,
    penaltyAway?: number
  ) => {
    if (!confirm('Bạn có chắc chắn cập nhật kết quả trận này? Điểm số người chơi sẽ được tính toán ngay lập tức.')) return;
    try {
      await updateMatchResult(matchId, homeScore, awayScore, isKnockout, winnerId, winMethod, score90Home, score90Away, penaltyHome, penaltyAway);
      alert('Cập nhật kết quả thành công!');
      setUpdatingMatch(null);
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleKnockoutSubmit = () => {
    // Validation
    setAdminError('');
    if (adminResult.winMethod === '90_mins') {
      if (adminResult.homeScore === adminResult.awayScore) {
        setAdminError("Lỗi: Trận đấu loại trực tiếp không thể hòa trong 90 phút! Hãy đổi hình thức sang Hiệp phụ hoặc Luân lưu.");
        return;
      } else {
        const actualWinner = adminResult.homeScore > adminResult.awayScore ? updatingMatch.home_team_id : updatingMatch.away_team_id;
        if (actualWinner !== adminResult.advancingTeamId) {
          setAdminError(`Lỗi mâu thuẫn: Tỷ số 90' lại nghiêng về đội khác! Vui lòng kiểm tra lại.`);
          return;
        }
      }
    } else if (adminResult.winMethod === 'extra_time') {
      if (adminResult.score90Home !== adminResult.score90Away) {
        setAdminError("Lỗi logic: Để đá Hiệp phụ, tỷ số 90 phút bắt buộc phải hòa!");
        return;
      } else if (adminResult.homeScore === adminResult.awayScore) {
        setAdminError("Lỗi: Nếu sau 120 phút vẫn hòa, hình thức phân định phải là Luân lưu (Penalty)!");
        return;
      } else {
        const actualWinner = adminResult.homeScore > adminResult.awayScore ? updatingMatch.home_team_id : updatingMatch.away_team_id;
        if (actualWinner !== adminResult.advancingTeamId) {
          setAdminError(`Lỗi mâu thuẫn: Tỷ số 120' lại nghiêng về đội khác! Vui lòng kiểm tra lại.`);
          return;
        }
      }
    } else if (adminResult.winMethod === 'penalties') {
      if (adminResult.score90Home !== adminResult.score90Away) {
        setAdminError("Lỗi logic: Để có Luân lưu, tỷ số 90 phút bắt buộc phải hòa!");
        return;
      } else if (adminResult.homeScore !== adminResult.awayScore) {
        setAdminError("Lỗi logic: Tỷ số chung cuộc (120') bắt buộc phải hòa thì mới đá Luân lưu!");
        return;
      } else if (adminResult.penaltyHome === adminResult.penaltyAway) {
        setAdminError("Lỗi: Tỷ số luân lưu không được phép hòa!");
        return;
      } else {
        const actualWinner = adminResult.penaltyHome > adminResult.penaltyAway ? updatingMatch.home_team_id : updatingMatch.away_team_id;
        if (actualWinner !== adminResult.advancingTeamId) {
          setAdminError(`Lỗi mâu thuẫn: Tỷ số luân lưu lại cho thấy đội khác thắng! Vui lòng kiểm tra lại.`);
          return;
        }
      }
    }

    handleUpdateResult(
      updatingMatch.id,
      adminResult.homeScore,
      adminResult.awayScore,
      true,
      adminResult.advancingTeamId,
      adminResult.winMethod,
      adminResult.score90Home,
      adminResult.score90Away,
      adminResult.penaltyHome,
      adminResult.penaltyAway
    );
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA trận đấu này? Toàn bộ dự đoán liên quan sẽ bị mất.')) return;
    try {
      await deleteMatchAdmin(matchId);
      alert('Đã xóa trận đấu thành công!');
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleResetPassword = async (requestId: string, username: string) => {
    const newPassword = prompt(`Nhập mật khẩu mới sẽ cấp cho user [${username}]:`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("Mật khẩu phải từ 6 ký tự trở lên!");
      return;
    }
    
    try {
      await resetUserPassword(requestId, username, newPassword);
      alert(`Thành công! Hãy nhắn cho user [${username}] mật khẩu mới là: ${newPassword}`);
      fetchData();
    } catch(err: any) { alert(err.message); }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản [${username}]? Toàn bộ điểm số và dự đoán của người này sẽ bị mất.`)) return;
    try {
      await deleteUserAccount(userId);
      alert(`Đã xóa tài khoản ${username} thành công!`);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleViewUserHistory = async (user: any) => {
    setSelectedUser(user);
    setLoading(true);
    const { data } = await supabase
      .from('predictions')
      .select('*, match:matches(*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name))')
      .eq('user_id', user.id);
    setUserPredictions(data || []);
    setLoading(false);
  };

  const handleViewMatchPredictions = async (match: any) => {
    setSelectedMatchForPredictions(match);
    setIsPredictionsModalOpen(true);
    setLoadingPredictions(true);
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id);
    
    const combined = allUsers.map(u => {
      const pred = data?.find(p => p.user_id === u.id);
      return {
        user: u,
        prediction: pred || null
      };
    });

    combined.sort((a, b) => {
      const ptA = a.prediction?.points_earned || 0;
      const ptB = b.prediction?.points_earned || 0;
      return ptB - ptA;
    });

    setMatchPredictionsList(combined);
    setLoadingPredictions(false);
  };

  const getPredictionAnalysis = (points: number, isKnockout: boolean) => {
    if (points === 0) return "Sai / Chưa dự đoán";
    if (isKnockout) {
      if (points === 15) return "Đúng đội đi tiếp & Hình thức";
      if (points === 10) return "Chỉ đúng đội đi tiếp";
    } else {
      if (points === 8) return "Đúng tỷ số 100%";
      if (points === 6) return "Sai tỷ số, đúng hiệu số";
      if (points === 5) return "Chỉ đúng kết quả (T/H/B)";
    }
    return `${points} điểm`;
  };

  const [filterRound, setFilterRound] = useState('Tất cả');

  const filteredMatches = matches.filter(m => {
    if (filterRound === 'Tất cả') return true;
    if (filterRound === 'Vòng Bảng' && (m.round?.startsWith('Bảng') || m.round === 'Vòng Bảng')) return true;
    return m.round === filterRound;
  });

  let groupedMatches: Record<string, Match[]> = {};

  if (filterRound === 'Tất cả') {
    groupedMatches = filteredMatches.reduce((acc, m) => {
      const dateStr = new Date(m.kickoff_time).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      const groupName = `Lịch thi đấu: ${dateStr}`;
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(m);
      return acc;
    }, {} as Record<string, Match[]>);
  } else {
    groupedMatches = filteredMatches.reduce((acc, m) => {
      const roundName = m.round || 'Vòng Bảng';
      if (!acc[roundName]) acc[roundName] = [];
      acc[roundName].push(m);
      return acc;
    }, {} as Record<string, Match[]>);
    
    Object.values(groupedMatches).forEach(matches => {
      matches.sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
    });
  }

  const getFlagEmoji = (teamName: string | undefined) => {
    if (!teamName) return '🏳️';
    const flags: Record<string, string> = {
      'Việt Nam': '🇻🇳', 'Thái Lan': '🇹🇭', 'Argentina': '🇦🇷', 'Pháp': '🇫🇷',
      'Brazil': '🇧🇷', 'Anh': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Đức': '🇩🇪', 'Tây Ban Nha': '🇪🇸',
      'Bồ Đào Nha': '🇵🇹', 'Hà Lan': '🇳🇱', 'Bỉ': '🇧🇪', 'Ý': '🇮🇹',
      'Mỹ': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Nhật Bản': '🇯🇵',
      'Hàn Quốc': '🇰🇷', 'Úc': '🇦🇺', 'Saudi Arabia': '🇸🇦', 'Nam Phi': '🇿🇦',
      'Senegal': '🇸🇳', 'Marocco': '🇲🇦', 'Cameroon': '🇨🇲', 'Ghana': '🇬🇭',
      'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Paraguay': '🇵🇾',
      'Thụy Sĩ': '🇨🇭', 'Thụy Điển': '🇸🇪', 'Ba Lan': '🇵🇱', 'Đan Mạch': '🇩🇰',
      'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Xứ Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'CH Séc': '🇨🇿', 'Ecuador': '🇪🇨', 'Tunisia': '🇹🇳', 'Haiti': '🇭🇹',
      'Curacao': '🇨🇼', 'Bosnia': '🇧🇦', 'Thổ Nhĩ Kỳ': '🇹🇷', 'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻',
      'Ai Cập': '🇪🇬', 'CHDC Congo': '🇨🇩'
    };
    return flags[teamName] || '🏳️';
  };

  const renderFlag = (team: any) => {
    if (team?.flag_url) {
      return <img src={team.flag_url} alt="flag" style={{ width: '32px', height: '22px', objectFit: 'cover', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} className="flex-shrink-0 border border-white/20" />;
    }
    return <div className="text-2xl leading-none filter drop-shadow-sm flex-shrink-0 flex items-center justify-center" style={{ width: '32px', height: '22px' }}>{getFlagEmoji(team?.name)}</div>;
  };

  return (
    <div className="flex flex-col gap-6 mt-8 pb-16">
      <h1 className="text-3xl font-bold text-center">Admin Panel</h1>
      
      {/* Tabs Navigation */}
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <button 
          onClick={() => setActiveTab('results')} 
          className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Cập Nhật Kết Quả
        </button>
        <button 
          onClick={() => setActiveTab('passwords')} 
          className={`btn ${activeTab === 'passwords' ? 'btn-warning' : 'btn-secondary'} relative`}
          style={activeTab === 'passwords' ? { color: '#000' } : {}}
        >
          Yêu Cầu Mật Khẩu
          {pwdRequests.length > 0 && (
            <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {pwdRequests.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={`btn ${activeTab === 'users' ? 'btn-danger' : 'btn-secondary'}`}
        >
          Quản Lý Người Dùng
        </button>
      </div>

      {/* Yêu cầu quên mật khẩu */}
      {activeTab === 'passwords' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', border: pwdRequests.length > 0 ? '2px solid var(--warning)' : 'none' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: pwdRequests.length > 0 ? 'var(--warning)' : 'var(--foreground)' }}>
            Yêu Cầu Cấp Lại Mật Khẩu ({pwdRequests.length})
          </h2>
          {pwdRequests.length === 0 ? (
            <p className="opacity-80">Hiện không có yêu cầu nào cần xử lý.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {pwdRequests.map(r => (
                <div key={r.id} className="flex justify-between items-center p-4" style={{ background: 'rgba(255, 204, 0, 0.1)', borderRadius: '8px' }}>
                  <div>
                    <div className="font-bold text-lg">{r.username}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Gửi lúc: {new Date(r.created_at).toLocaleString('vi-VN')}</div>
                  </div>
                  <button onClick={() => handleResetPassword(r.id, r.username)} className="btn btn-primary" style={{ background: 'var(--warning)', color: '#000' }}>
                    CẤP LẠI MẬT KHẨU
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cập nhật Kết quả */}
      {activeTab === 'results' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold">Cập Nhật Kết Quả ({filteredMatches.length} trận)</h2>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-400">Lọc theo vòng:</span>
              <select 
                value={filterRound} 
                onChange={e => setFilterRound(e.target.value)}
                className="bg-black/40 border border-gray-600 rounded-md p-2 font-bold text-white"
              >
                <option value="Tất cả">-- Tất cả --</option>
                <option value="Bảng A">Bảng A</option>
                <option value="Bảng B">Bảng B</option>
                <option value="Bảng C">Bảng C</option>
                <option value="Bảng D">Bảng D</option>
                <option value="Bảng E">Bảng E</option>
                <option value="Bảng F">Bảng F</option>
                <option value="Bảng G">Bảng G</option>
                <option value="Bảng H">Bảng H</option>
                <option value="Bảng I">Bảng I</option>
                <option value="Bảng J">Bảng J</option>
                <option value="Bảng K">Bảng K</option>
                <option value="Bảng L">Bảng L</option>
                <option value="Vòng 32 đội">Vòng 32 đội</option>
                <option value="Vòng 16 đội">Vòng 16 đội</option>
                <option value="Tứ kết">Tứ kết</option>
                <option value="Bán kết">Bán kết</option>
                <option value="Tranh hạng ba">Tranh hạng ba</option>
                <option value="Chung kết">Chung kết</option>
              </select>
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <p className="opacity-80">Chưa có trận đấu nào trong hệ thống thuộc vòng đấu này.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {Object.entries(groupedMatches).map(([roundName, roundMatches]) => (
                <div key={roundName} className="flex flex-col gap-4">
                  {/* Vòng đấu Header */}
                  <div className="text-primary font-bold text-lg border-b border-gray-700 pb-2 uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    🏆 {roundName} - {roundMatches.length} trận
                  </div>
                  
                  {/* Các trận trong vòng */}
                  <div className="flex flex-col gap-2">
                    {roundMatches.map((m) => (
                      <div key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 0' }}>
                        {m.status === 'finished' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            {/* Left: Delete & Round */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '15%' }}>
                              <button onClick={() => handleDeleteMatch(m.id)} style={{ backgroundColor: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }} title="Xóa trận này">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                Xóa
                              </button>
                              <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{m.round || 'Bảng A'}</span>
                            </div>
                          
                            {/* Center: Match Data */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '70%', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '35%', gap: '0.5rem' }}>
                                <span style={{ color: 'white', fontWeight: 'bold', textAlign: 'right', fontSize: '15px' }}>{m.home_team?.name}</span>
                                {renderFlag(m.home_team)}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '120px', height: '40px', backgroundColor: '#0a0a0c', border: '1px solid #222', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                  {m.home_score}
                                </div>
                                <span style={{ color: '#666', fontWeight: 'bold' }}>-</span>
                                <div style={{ width: '120px', height: '40px', backgroundColor: '#0a0a0c', border: '1px solid #222', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                  {m.away_score}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '35%', gap: '0.5rem' }}>
                                {renderFlag(m.away_team)}
                                <span style={{ color: 'white', fontWeight: 'bold', textAlign: 'left', fontSize: '15px' }}>{m.away_team?.name}</span>
                              </div>
                            </div>
                          
                            {/* Right: Status & Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '15%' }}>
                              <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Đã xong</span>
                              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                {new Date(m.kickoff_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={(e: any) => { 
                            e.preventDefault(); 
                            const h = Number(e.target.home.value);
                            const a = Number(e.target.away.value);
                            const isKnockout = m.round && !m.round.startsWith('Bảng') && m.round !== 'Vòng Bảng';
                            
                            if (isKnockout) {
                              setUpdatingMatch(m);
                              setAdminResult({
                                ...adminResult,
                                homeScore: h,
                                awayScore: a,
                                advancingTeamId: m.home_team_id,
                                winMethod: '90_mins',
                                score90Home: h,
                                score90Away: a
                              });
                            } else {
                              handleUpdateResult(m.id, h, a); 
                            }
                          }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            {/* Left: Delete & Round */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '15%' }}>
                              <button type="button" onClick={() => handleDeleteMatch(m.id)} style={{ backgroundColor: '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', border: 'none', cursor: 'pointer' }} title="Xóa trận này">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                Xóa
                              </button>
                              <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{m.round || 'Bảng A'}</span>
                            </div>
                          
                            {/* Center: Match Data */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '70%', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '35%', gap: '0.5rem' }}>
                                <span style={{ color: 'white', fontWeight: 'bold', textAlign: 'right', fontSize: '15px' }}>{m.home_team?.name}</span>
                                {renderFlag(m.home_team)}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <input name="home" type="number" min="0" required placeholder="0" style={{ width: '120px', height: '40px', backgroundColor: '#0a0a0c', border: '1px solid #222', borderRadius: '12px', color: '#9ca3af', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', outline: 'none' }} />
                                <span style={{ color: '#666', fontWeight: 'bold' }}>-</span>
                                <input name="away" type="number" min="0" required placeholder="0" style={{ width: '120px', height: '40px', backgroundColor: '#0a0a0c', border: '1px solid #222', borderRadius: '12px', color: '#9ca3af', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', outline: 'none' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '35%', gap: '0.5rem' }}>
                                {renderFlag(m.away_team)}
                                <span style={{ color: 'white', fontWeight: 'bold', textAlign: 'left', fontSize: '15px' }}>{m.away_team?.name}</span>
                              </div>
                            </div>
                          
                            {/* Right: Submit & Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '15%' }}>
                              <button type="submit" style={{ backgroundColor: '#006aff', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                LƯU KẾT QUẢ
                              </button>
                              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                {new Date(m.kickoff_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </form>
                        )}
                        <div className="flex justify-center mt-3">
                          <button 
                            type="button"
                            onClick={() => handleViewMatchPredictions(m)} 
                            className="btn btn-secondary flex items-center justify-center gap-2" 
                            style={{ padding: '6px 16px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#e5e7eb', transition: 'all 0.2s' }}
                          >
                            <span>👁️</span> Xem thông tin dự đoán
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quản lý Người dùng */}
      {activeTab === 'users' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', border: '1px solid rgba(255, 0, 76, 0.3)' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--danger)' }}>Quản Lý Người Dùng</h2>
          <p className="mb-4 text-sm opacity-80">Cẩn trọng: Xóa tài khoản sẽ xóa vĩnh viễn toàn bộ dữ liệu dự đoán và điểm số của người đó.</p>
          {allUsers.length === 0 ? (
            <p className="opacity-80">Chưa có người dùng nào.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[400px]" style={{ overflowY: 'auto', paddingRight: '1rem' }}>
              {allUsers.map(u => (
                <div key={u.id} className="flex justify-between items-center p-4" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div>
                    <div className="font-bold text-lg">{u.display_name}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Điểm: {u.total_points} - Tham gia: {new Date(u.created_at).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewUserHistory(u)} className="btn" style={{ padding: '0.5rem 1rem', background: '#00d2ff', color: '#000', fontWeight: 'bold' }}>
                      XEM CHI TIẾT
                    </button>
                    <button onClick={() => handleDeleteUser(u.id, u.display_name)} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
                      XÓA TÀI KHOẢN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Lịch sử dự đoán của User */}
      {mounted && selectedUser && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="backdrop-blur-sm">
          <div className="glass-panel" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#00d2ff' }}>Lịch sử dự đoán: {selectedUser.display_name}</h2>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Đóng</button>
            </div>
            
            {loading ? <div className="text-center">Đang tải...</div> : (
              <div className="flex flex-col gap-3">
                {userPredictions.length === 0 ? <p className="text-center opacity-80 py-8">Người dùng này chưa dự đoán trận nào.</p> : userPredictions.map(p => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '8px', borderLeft: p.match?.round === 'DELETED' ? '4px solid #ff004c' : '4px solid #00d2ff' }}>
                    <div className="flex justify-between mb-3 items-center">
                      <span className="font-bold text-xl">{p.match?.home_team?.name} vs {p.match?.away_team?.name}</span>
                      {p.match?.round === 'DELETED' && <span style={{ background: '#ff004c', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>ĐÃ XÓA</span>}
                    </div>
                    <div className="flex justify-between items-end opacity-90">
                      <div className="flex flex-col gap-1">
                        <div style={{ fontSize: '1.1rem' }}>Dự đoán của user: <strong className="text-white">{p.home_score} - {p.away_score}</strong></div>
                        <div style={{ fontSize: '1rem', color: '#a3a3a3' }}>
                          Thực tế: {p.match?.status === 'finished' ? <strong className="text-white">{p.match.home_score} - {p.match.away_score}</strong> : <em>{p.match?.status === 'live' ? 'Đang đá' : 'Chưa diễn ra'}</em>}
                        </div>
                      </div>
                      <div className="text-right">
                        Điểm nhận được<br/>
                        <strong style={{ color: '#00ff87', fontSize: '1.5rem' }}>+{p.points_earned || 0}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Modal Cập nhật Knockout */}
      {mounted && updatingMatch && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="backdrop-blur-sm">
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', border: '1px solid var(--primary)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#00d2ff' }}>Cập nhật: {updatingMatch.home_team?.name} vs {updatingMatch.away_team?.name}</h2>
              <button onClick={() => setUpdatingMatch(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Hủy</button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block mb-1 text-sm text-gray-400">Hình thức phân định</label>
                <select className="input w-full p-2 bg-[#1a1a1a] rounded border border-gray-700" 
                  value={adminResult.winMethod} 
                  onChange={e => setAdminResult({...adminResult, winMethod: e.target.value as any})}>
                  <option value="90_mins">Trong 90 Phút</option>
                  <option value="extra_time">Hiệp phụ (120 Phút)</option>
                  <option value="penalties">Luân lưu (Penalty)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm text-gray-400">
                  {updatingMatch.round === 'Chung kết' ? 'Đội vô địch' : updatingMatch.round === 'Tranh hạng ba' ? 'Đội chiến thắng' : 'Đội đi tiếp'} (Thắng cuộc)
                </label>
                <select className="input w-full p-2 bg-[#1a1a1a] rounded border border-gray-700 text-[var(--success)] font-bold" 
                  value={adminResult.advancingTeamId} 
                  onChange={e => setAdminResult({...adminResult, advancingTeamId: e.target.value})}>
                  <option value={updatingMatch.home_team_id}>{updatingMatch.home_team?.name}</option>
                  <option value={updatingMatch.away_team_id}>{updatingMatch.away_team?.name}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm text-gray-400">Tỷ số Chung cuộc {adminResult.winMethod === '90_mins' ? "(90')" : "(120')"}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-gray-700" value={adminResult.homeScore} onChange={e => setAdminResult({...adminResult, homeScore: +e.target.value})} />
                    <span>-</span>
                    <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-gray-700" value={adminResult.awayScore} onChange={e => setAdminResult({...adminResult, awayScore: +e.target.value})} />
                  </div>
                </div>

                {adminResult.winMethod !== '90_mins' && (
                  <div>
                    <label className="block mb-1 text-sm text-gray-400">Tỷ số 90 phút (bổ sung)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-gray-700" value={adminResult.score90Home} onChange={e => setAdminResult({...adminResult, score90Home: +e.target.value})} />
                      <span>-</span>
                      <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-gray-700" value={adminResult.score90Away} onChange={e => setAdminResult({...adminResult, score90Away: +e.target.value})} />
                    </div>
                  </div>
                )}

                {adminResult.winMethod === 'penalties' && (
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm text-warning font-bold">Tỷ số Luân lưu (Penalty)</label>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-right">{updatingMatch.home_team?.name}</span>
                      <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-warning/50 text-warning" value={adminResult.penaltyHome} onChange={e => setAdminResult({...adminResult, penaltyHome: +e.target.value})} />
                      <span>-</span>
                      <input type="number" className="w-16 p-2 bg-[#1a1a1a] rounded text-center border border-warning/50 text-warning" value={adminResult.penaltyAway} onChange={e => setAdminResult({...adminResult, penaltyAway: +e.target.value})} />
                      <span className="w-16">{updatingMatch.away_team?.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {adminError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mt-2 text-sm font-bold">
                  {adminError}
                </div>
              )}

              <button onClick={handleKnockoutSubmit} className="btn btn-primary mt-4 py-3 text-lg font-bold">
                XÁC NHẬN KẾT QUẢ KNOCK-OUT
              </button>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: View Predictions */}
      {mounted && isPredictionsModalOpen && selectedMatchForPredictions && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                  Thông tin dự đoán của người chơi <span style={{ fontSize: '0.875rem', color: '#a3a3a3', fontWeight: 'normal', marginLeft: '0.5rem' }}>({matchPredictionsList.filter(i => i.prediction).length}/{matchPredictionsList.length} người đã dự đoán)</span>
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedMatchForPredictions.round}</span>
                  <span>|</span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedMatchForPredictions.home_team?.name} vs {selectedMatchForPredictions.away_team?.name}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
                      "STT,Người chơi,Email,Thời gian dự đoán,Kết quả chọn,Dự đoán tỷ số/Hình thức,Điểm số,Phân tích\n" + 
                      matchPredictionsList.map((item, index) => {
                        const isKnockout = selectedMatchForPredictions.round && !selectedMatchForPredictions.round.startsWith('Bảng') && selectedMatchForPredictions.round !== 'Vòng Bảng';
                        const p = item.prediction;
                        if (!p) return `"${index + 1}","${item.user.display_name}","${item.user.email}","-","Chưa dự đoán","-","-","-"`;
                        let voteResult = "";
                        let predDetails = "";
                        if (isKnockout) {
                          voteResult = p.prediction_result;
                          predDetails = p.prediction_method === '90_mins' ? "90'" : p.prediction_method === 'extra_time' ? "120'" : "Pen";
                        } else {
                          if (p.home_score > p.away_score) voteResult = `${selectedMatchForPredictions.home_team?.name} thắng`;
                          else if (p.home_score < p.away_score) voteResult = `${selectedMatchForPredictions.away_team?.name} thắng`;
                          else voteResult = "Hòa";
                          predDetails = `${p.home_score} - ${p.away_score}`;
                        }
                        const pts = p.points_earned || 0;
                        const analysis = selectedMatchForPredictions.status !== 'finished' ? "-" : getPredictionAnalysis(pts, isKnockout);
                        const timeStr = p.updated_at ? new Date(p.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
                        return `"${index + 1}","${item.user.display_name}","${item.user.email}","${timeStr}","${voteResult}","${predDetails}","${pts}","${analysis}"`;
                      }).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `predictions_${selectedMatchForPredictions.home_team?.name}_vs_${selectedMatchForPredictions.away_team?.name}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  📥 XUẤT CSV
                </button>
                <button 
                  onClick={() => setIsPredictionsModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#a3a3a3', fontSize: '1.25rem', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 0, overflowY: 'auto', flex: 1 }}>
              {loadingPredictions ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#a3a3a3' }}>Đang tải dữ liệu...</div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.6)', color: '#a3a3a3', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Người chơi</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Thời gian dự đoán</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Kết quả chọn</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Dự đoán</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Điểm số</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Phân tích</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchPredictionsList.map((item, index) => {
                      const isKnockout = selectedMatchForPredictions.round && !selectedMatchForPredictions.round.startsWith('Bảng') && selectedMatchForPredictions.round !== 'Vòng Bảng';
                      const p = item.prediction;
                      
                      return (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#6b7280', fontWeight: 'bold' }}>{index + 1}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>{item.user.display_name || item.user.email?.split('@')[0]}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{item.user.email}</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {p && p.updated_at ? new Date(p.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                            {!p ? (
                              <span style={{ color: '#4b5563', fontStyle: 'italic' }}>-</span>
                            ) : isKnockout ? (
                              <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>{p.prediction_result}</span>
                            ) : (
                              <span style={{ color: p.home_score > p.away_score ? '#00d2ff' : p.home_score < p.away_score ? '#ff004c' : '#ffcc00', fontWeight: 'bold' }}>
                                {p.home_score > p.away_score ? `${selectedMatchForPredictions.home_team?.name} thắng` : p.home_score < p.away_score ? `${selectedMatchForPredictions.away_team?.name} thắng` : 'Hòa'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                            {!p ? (
                              <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Chưa dự đoán</span>
                            ) : isKnockout ? (
                              <div style={{ color: '#22d3ee', fontWeight: 'bold' }}>{p.prediction_result} <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '0.75rem', marginLeft: '0.25rem' }}>({p.prediction_method === '90_mins' ? "90'" : p.prediction_method === 'extra_time' ? "120'" : "Pen"})</span></div>
                            ) : (
                              <div style={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '1.125rem', letterSpacing: '0.1em' }}>{p.home_score} - {p.away_score}</div>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                            {!p || selectedMatchForPredictions.status !== 'finished' ? (
                              <span style={{ color: '#4b5563' }}>-</span>
                            ) : (
                              <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: p.points_earned > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {p.points_earned > 0 ? `+${p.points_earned}` : '0'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {!p || selectedMatchForPredictions.status !== 'finished' ? (
                              <span style={{ color: '#4b5563' }}>-</span>
                            ) : (
                              <span style={{ color: '#d1d5db', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.375rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}>
                                {getPredictionAnalysis(p.points_earned, isKnockout)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
