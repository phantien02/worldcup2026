"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useParams } from 'next/navigation';
import { isBefore } from 'date-fns';
import Link from 'next/link';
import { resolvePlaceholderTeam } from '@/utils/standings';
import matchMapping from '@/data/matchMapping.json';
import CountdownTimer from '@/components/CountdownTimer';
import confetti from 'canvas-confetti';

type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team: { name: string; flag_url: string };
  away_team: { name: string; flag_url: string };
  kickoff_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  round?: string;
};

type Prediction = {
  id: string;
  prediction_result: string;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
  user_id: string;
  advancing_team_id?: string;
  predicted_win_method?: string;
  profiles: { display_name: string };
};

export default function MatchPage() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  
  const [resultChoice, setResultChoice] = useState<'home_win' | 'draw' | 'away_win' | ''>('');
  const [myPrediction, setMyPrediction] = useState({ home: '' as number | '', away: '' as number | '' });
  const [advancingTeamId, setAdvancingTeamId] = useState('');
  const [predictedWinMethod, setPredictedWinMethod] = useState<'90_mins'|'extra_time'|'penalties'|''>('');
  
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [popupType, setPopupType] = useState<'perfect' | 'correct' | 'wrong' | null>(null);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(d => setIsAdminMode(d.isAdmin))
      .catch(() => {});
  }, []);

  // Polling /api/live 10s/lần nếu trận đấu này đang diễn ra
  useEffect(() => {
    if (!match) return;
    
    const now = Date.now();
    const kickoff = new Date(match.kickoff_time).getTime();
    const diffMinutes = (now - kickoff) / (1000 * 60);
    const isActive = match.status === 'live' || (match.status === 'pending' && diffMinutes >= -15 && diffMinutes <= 48 * 60);

    if (!isActive) return;

    const intervalId = setInterval(async () => {
      try {
        await fetch('/api/live');
      } catch (err) {}
    }, 10000);

    return () => clearInterval(intervalId);
  }, [match]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id, kickoff_time, status, home_score, away_score, round, home_team_id, away_team_id, events,
          home_team:home_team_id (name, flag_url),
          away_team:away_team_id (name, flag_url)
        `)
        .eq('id', id)
        .single();

      if (matchData) setMatch(matchData as any);

      // Fetch all matches to calculate group standings for placeholders
      const { data: allMatchesData } = await supabase
        .from('matches')
        .select(`
          round, status, home_score, away_score,
          home_team:home_team_id (name, flag_url),
          away_team:away_team_id (name, flag_url)
        `);
      if (allMatchesData) setAllMatches(allMatchesData);

      const { data: predsData } = await supabase
        .from('predictions')
        .select(`
          id, prediction_result, home_score, away_score, updated_at, user_id,
          advancing_team_id, predicted_win_method, points_earned,
          profiles(display_name)
        `)
        .eq('match_id', id);

      if (predsData) {
        const validPreds = (predsData as any[]).filter(p => p.profiles?.display_name !== 'guest');
        setPredictions(validPreds);
        if (user) {
          const mine = predsData.find(p => p.user_id === user.id);
          if (mine) {
            setResultChoice(mine.prediction_result as any);
            if (mine.home_score !== null && mine.away_score !== null) {
              setMyPrediction({ home: mine.home_score, away: mine.away_score });
            }
            if (mine.advancing_team_id) setAdvancingTeamId(mine.advancing_team_id);
            if (mine.predicted_win_method) setPredictedWinMethod(mine.predicted_win_method as any);
            
            if (matchData?.status === 'finished' && mine.points_earned !== null) {
              let type: 'perfect' | 'correct' | 'wrong' | null = null;
              if (mine.points_earned === 8 || mine.points_earned === 15) type = 'perfect';
              else if (mine.points_earned === 5 || mine.points_earned === 6 || mine.points_earned === 10) type = 'correct';
              else type = 'wrong';
              
              setPopupType(type);
              setShowResultPopup(true);
              
              if (type === 'perfect' || type === 'correct') {
                setTimeout(() => {
                  confetti({
                    particleCount: type === 'perfect' ? 150 : 80,
                    spread: type === 'perfect' ? 100 : 70,
                    origin: { y: 0.5, x: 0.5 },
                    zIndex: 9999999
                  });
                }, 500);
              }
              
              setTimeout(() => {
                setShowResultPopup(false);
              }, 5000);
            }
          }
        }
      }

      setLoading(false);
    }

    if (id) {
      fetchData();

      const channel = supabase.channel(`match-${id}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions', filter: `match_id=eq.${id}` }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

  useEffect(() => {
    if (match && match.status !== 'pending') {
      setIsLocked(true);
    } else {
      // CountdownTimer will set isLocked if it expires, 
      // but initially we assume unlocked until timer says otherwise if status is pending
      setIsLocked(false);
    }
  }, [match]);
  
  const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
  const isKnockout = match ? knockoutRounds.includes(match.round || '') : false;

  const isGuest = user?.email === 'guest@wc2026.local';

  const handleSavePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ text: 'Bạn cần đăng nhập để dự đoán!', type: 'danger' });
      return;
    }
    if (isGuest) {
      setMessage({ text: 'Đây là tài khoản Khách. Vui lòng đăng ký tài khoản thật để lưu dự đoán của bạn nhé!', type: 'danger' });
      return;
    }
    if (isLocked) {
      setMessage({ text: 'Trận đấu đã khóa dự đoán!', type: 'danger' });
      return;
    }

    const payload: any = {
      user_id: user.id,
      match_id: id,
      updated_at: new Date().toISOString()
    };

    if (isKnockout) {
      if (!advancingTeamId) {
        setMessage({ text: 'Vui lòng chọn đội đi tiếp!', type: 'danger' });
        return;
      }
      if (!predictedWinMethod) {
        setMessage({ text: 'Vui lòng chọn hình thức đi tiếp!', type: 'danger' });
        return;
      }
      payload.advancing_team_id = advancingTeamId;
      payload.predicted_win_method = predictedWinMethod;
    } else {
      if (!resultChoice) {
        setMessage({ text: 'Vui lòng chọn kết quả Thắng/Hòa/Thua!', type: 'danger' });
        return;
      }
      
      const hasScore = myPrediction.home !== '' && myPrediction.away !== '';
      if (myPrediction.home !== '' || myPrediction.away !== '') {
        if (!hasScore) {
          setMessage({ text: 'Vui lòng nhập đầy đủ tỷ số cả 2 đội hoặc để trống cả hai!', type: 'danger' });
          return;
        }
        const h = Number(myPrediction.home);
        const a = Number(myPrediction.away);
        if (resultChoice === 'home_win' && h <= a) {
          setMessage({ text: 'Tỷ số không khớp với kết quả Đội nhà Thắng!', type: 'danger' });
          return;
        }
        if (resultChoice === 'away_win' && a <= h) {
          setMessage({ text: 'Tỷ số không khớp với kết quả Đội khách Thắng!', type: 'danger' });
          return;
        }
        if (resultChoice === 'draw' && h !== a) {
          setMessage({ text: 'Tỷ số không khớp với kết quả Hòa!', type: 'danger' });
          return;
        }
      }

      payload.prediction_result = resultChoice;
      payload.home_score = hasScore ? Number(myPrediction.home) : null;
      payload.away_score = hasScore ? Number(myPrediction.away) : null;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Có lỗi xảy ra khi lưu dự đoán');
      }

      setMessage({ text: 'Đã lưu dự đoán thành công!', type: 'success' });
      const { data: predsData } = await supabase
        .from('predictions')
        .select(`id, prediction_result, home_score, away_score, updated_at, user_id, advancing_team_id, predicted_win_method, profiles(display_name)`)
        .eq('match_id', id);
      if (predsData) setPredictions(predsData as any);
    } catch (error: any) {
      setMessage({ text: 'Lỗi: ' + error.message, type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const stats = { winHome: 0, draw: 0, winAway: 0 };
  const statsKnockout = { homeAdvancing: 0, awayAdvancing: 0, win90: 0, win120: 0, winPen: 0 };
  const scoreCounts: Record<string, number> = {};

  predictions.forEach(p => {
    if (p.prediction_result === 'home_win') stats.winHome++;
    else if (p.prediction_result === 'draw') stats.draw++;
    else if (p.prediction_result === 'away_win') stats.winAway++;

    if (p.home_score !== null && p.away_score !== null) {
      const scoreStr = `${p.home_score} - ${p.away_score}`;
      scoreCounts[scoreStr] = (scoreCounts[scoreStr] || 0) + 1;
    }

    if (p.advancing_team_id && match) {
      if (p.advancing_team_id === match.home_team_id) statsKnockout.homeAdvancing++;
      if (p.advancing_team_id === match.away_team_id) statsKnockout.awayAdvancing++;
    }
    if (p.predicted_win_method === '90_mins') statsKnockout.win90++;
    if (p.predicted_win_method === 'extra_time') statsKnockout.win120++;
    if (p.predicted_win_method === 'penalties') statsKnockout.winPen++;
  });
  const total = predictions.length || 1;
  const topScores = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);


  if (loading) return <div className="text-center mt-8">Đang tải chi tiết trận đấu...</div>;
  if (!match) return <div className="text-center mt-8 text-red-500">Không tìm thấy trận đấu!</div>;

  const isPlaceholderName = (name: string) => /^(nhất|nhì|ba|thứ\s*3|thắng|thua)\s/i.test(name);
  const renderTeamInfo = (teamData: any) => {
    if (!teamData) return { name: 'TBD', flag: null };
    const resolved = resolvePlaceholderTeam(teamData.name, allMatches);
    if (resolved) return { name: resolved.name, flag: resolved.flag_url };
    if (isPlaceholderName(teamData.name)) return { name: teamData.name, flag: null };
    return { name: teamData.name, flag: teamData.flag_url };
  };
  const home = renderTeamInfo(match.home_team);
  const away = renderTeamInfo(match.away_team);

  return (
    <>
      {showResultPopup && popupType && (
        <div className="fixed inset-0 flex items-center justify-center z-[999999] bg-black/60 backdrop-blur-md" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
          <div className="glass-panel text-center flex flex-col items-center justify-center p-8 w-[90%] max-w-[400px] mx-auto" style={{ border: popupType === 'perfect' ? '2px solid #00ff87' : popupType === 'correct' ? '2px solid #00d2ff' : '2px solid #ff004c', boxShadow: `0 0 40px ${popupType === 'perfect' ? '#00ff8788' : popupType === 'correct' ? '#00d2ff88' : '#ff004c88'}`, transform: 'scale(1)', animation: 'bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
              {popupType === 'perfect' ? '🤯' : popupType === 'correct' ? '🎉' : '😢'}
            </div>
            <h2 className="text-2xl font-bold mb-4 uppercase" style={{ color: popupType === 'perfect' ? '#00ff87' : popupType === 'correct' ? '#00d2ff' : '#ff004c', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {popupType === 'perfect' ? 'Chúc mừng Thánh đoán!' : popupType === 'correct' ? 'Chúc mừng đoán đúng kết quả!' : 'Rất tiếc, chia buồn nhé!'}
            </h2>
            <p className="text-lg leading-relaxed text-white">
              {popupType === 'perfect' 
                ? 'Bạn đã dự đoán chính xác CẢ KẾT QUẢ lẫn TỶ SỐ trận đấu! Quá đỉnh!' 
                : popupType === 'correct' 
                  ? 'Bạn đã đoán đúng đội chiến thắng trận đấu nhưng hơi tiếc vì sai mất tỷ số!' 
                  : 'Chia buồn nhé, chúc bạn may mắn và phục thù ở các trận đấu tiếp theo!'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 mt-8 pb-16 animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>

      {/* Match Header */}
      <div className="glass-panel relative" style={{ padding: '1.5rem 1rem' }}>
        <div className="mb-4 md:absolute md:top-6 md:left-6 z-10 flex justify-start">
          <Link href="/" className="btn btn-secondary inline-flex items-center justify-center gap-2" style={{ padding: '0.4rem 0.8rem', borderRadius: '50px' }}>
            <span style={{ fontSize: '1.1rem' }}>⬅</span> <span className="text-sm font-bold">QUAY LẠI</span>
          </Link>
        </div>
        <div className="text-center mb-6 pt-2 md:pt-0">
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold', color: '#00d2ff', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {(matchMapping as any)[`${home.name} vs ${away.name}`] || 'TRẬN ĐẤU'}
            </span>
          </div>
          <span className={`badge ${
            match.status === 'finished' ? 'badge-success' : 
            (match.status === 'live' || (match.status === 'pending' && new Date() >= new Date(match.kickoff_time))) ? 'badge-danger' : 
            (match.status === 'pending' && (new Date(match.kickoff_time).getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 12) ? 'badge-warning' : 'badge-secondary'
          }`}>
            {match.status === 'finished' ? 'Đã xong' : 
             (match.status === 'live' || (match.status === 'pending' && new Date() >= new Date(match.kickoff_time))) ? <span className="animate-pulse">Đang diễn ra</span> : 
             (match.status === 'pending' && (new Date(match.kickoff_time).getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 12) ? 'Sắp diễn ra' : 'Chưa diễn ra'}
          </span>
          <div className="mt-4 font-semibold" style={{ opacity: 0.8 }}>{new Date(match.kickoff_time).toLocaleString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
          
          {match.status === 'pending' && !isLocked && (
            <CountdownTimer kickoffTime={match.kickoff_time} onExpire={() => setIsLocked(true)} />
          )}
        </div>

        <div className="flex justify-between items-center w-full mt-6 px-1 md:px-8">
          <div className="flex flex-col items-center gap-2 md:gap-4" style={{ flex: 1, minWidth: 0 }}>
            {home.flag ? <img src={home.flag} className="flag-icon" style={{ width: '60px', height: '45px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('hidden'); (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} /> : null}
            <div className="flag-icon flex items-center justify-center text-gray-400 font-bold" style={{ width: '60px', height: '45px', background: 'rgba(255,255,255,0.05)', fontSize: '1.5rem', display: home.flag ? 'none' : 'flex' }} hidden={home.flag ? true : undefined}>?</div>
            <span className="text-center font-bold text-sm md:text-2xl truncate w-full px-1">{home.name}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center" style={{ flexShrink: 0, padding: '0 0.5rem' }}>
            <div className="text-center" style={{ fontSize: match.status !== 'pending' ? '2.5rem' : '1.8rem', fontWeight: '900', background: 'var(--primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', whiteSpace: 'nowrap' }}>
              {match.status !== 'pending' ? `${match.home_score} - ${match.away_score}` : (new Date() >= new Date(match.kickoff_time) ? <div style={{ color: 'var(--danger)', fontSize: '1rem', textTransform: 'uppercase', lineHeight: '1.4', background: 'none', WebkitTextFillColor: 'initial' }}>Kết quả đang<br/>được cập nhật</div> : 'VS')}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 md:gap-4" style={{ flex: 1, minWidth: 0 }}>
            {away.flag ? <img src={away.flag} className="flag-icon" style={{ width: '60px', height: '45px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('hidden'); (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }} /> : null}
            <div className="flag-icon flex items-center justify-center text-gray-400 font-bold" style={{ width: '60px', height: '45px', background: 'rgba(255,255,255,0.05)', fontSize: '1.5rem', display: away.flag ? 'none' : 'flex' }} hidden={away.flag ? true : undefined}>?</div>
            <span className="text-center font-bold text-sm md:text-2xl truncate w-full px-1">{away.name}</span>
          </div>
        </div>


      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Prediction Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span style={{ color: 'var(--success)' }}>●</span> Dự đoán của bạn
          </h3>
          
          {message.text && (
            <div className={`badge badge-${message.type} mb-6 block text-center`} style={{ padding: '0.75rem', fontSize: '1rem' }}>{message.text}</div>
          )}

          {isAdminMode && !user ? (
            <div className="text-center" style={{ padding: '1.5rem', background: 'rgba(255,0,76,0.1)', borderRadius: '16px', border: '1px solid var(--danger)' }}>
              <p style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>Bạn đang ở Chế độ Admin</p>
              <p style={{ opacity: 0.8 }}>Tài khoản Admin chỉ có quyền xem dữ liệu, không thể tham gia dự đoán.</p>
            </div>
          ) : isLocked ? (
            <div className="text-center" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'var(--warning)', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>Đã hết thời gian dự đoán!</p>
              {isKnockout ? (
                <div>
                   <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                    {match.round === 'Chung kết' ? 'Đội vô địch:' : match.round === 'Tranh hạng ba' ? 'Đội chiến thắng:' : 'Đội đi tiếp:'} <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{advancingTeamId === match.home_team_id ? match.home_team?.name : advancingTeamId === match.away_team_id ? match.away_team?.name : 'Chưa dự đoán'}</strong>
                  </div>
                  {predictedWinMethod && (
                    <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                      Hình thức: <strong style={{ color: 'var(--warning)' }}>{predictedWinMethod === '90_mins' ? "Trong 90 Phút" : predictedWinMethod === 'extra_time' ? "Hiệp phụ" : "Luân lưu (Penalty)"}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                    Kết quả đã chọn: <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{resultChoice === 'home_win' ? `${match.home_team?.name} Thắng` : resultChoice === 'away_win' ? `${match.away_team?.name} Thắng` : resultChoice === 'draw' ? 'Hòa' : 'Chưa dự đoán'}</strong>
                  </div>
                  {myPrediction.home !== '' && resultChoice && (
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'inline-block' }}>
                      Tỷ số: {myPrediction.home} - {myPrediction.away}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSavePrediction} className="flex flex-col gap-8">
              
              {isKnockout ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      1. {match.round === 'Chung kết' ? 'Chọn Đội vô địch' : match.round === 'Tranh hạng ba' ? 'Chọn Đội chiến thắng' : 'Chọn Đội đi tiếp'} (Bắt buộc)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button type="button" onClick={() => setAdvancingTeamId(match.home_team_id)} 
                        style={{ padding: '1rem', borderRadius: '12px', fontWeight: 'bold', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)',
                          background: advancingTeamId === match.home_team_id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          boxShadow: advancingTeamId === match.home_team_id ? '0 0 15px var(--primary)' : 'none', color: '#fff' }}>
                        {match.home_team?.name}
                      </button>
                      <button type="button" onClick={() => setAdvancingTeamId(match.away_team_id)} 
                        style={{ padding: '1rem', borderRadius: '12px', fontWeight: 'bold', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)',
                          background: advancingTeamId === match.away_team_id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          boxShadow: advancingTeamId === match.away_team_id ? '0 0 15px var(--primary)' : 'none', color: '#fff' }}>
                        {match.away_team?.name}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>
                      2. Chọn hình thức phân định (Bắt buộc)
                    </label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 p-3 bg-black/20 rounded cursor-pointer border border-white/5 hover:border-white/20 transition-all">
                        <input type="radio" name="winMethod" value="90_mins" checked={predictedWinMethod === '90_mins'} onChange={() => setPredictedWinMethod('90_mins')} className="w-5 h-5 accent-primary" />
                        <span className="text-lg">Trong 90 Phút</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-black/20 rounded cursor-pointer border border-white/5 hover:border-white/20 transition-all">
                        <input type="radio" name="winMethod" value="extra_time" checked={predictedWinMethod === 'extra_time'} onChange={() => setPredictedWinMethod('extra_time')} className="w-5 h-5 accent-primary" />
                        <span className="text-lg">Hiệp phụ (120 Phút)</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-black/20 rounded cursor-pointer border border-white/5 hover:border-white/20 transition-all">
                        <input type="radio" name="winMethod" value="penalties" checked={predictedWinMethod === 'penalties'} onChange={() => setPredictedWinMethod('penalties')} className="w-5 h-5 accent-primary" />
                        <span className="text-lg">Luân lưu (Penalty)</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Primary Choice: W/D/L */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>1. Chọn Kết Quả (Bắt buộc)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button type="button" onClick={() => setResultChoice('home_win')} 
                        style={{ padding: '1rem', borderRadius: '12px', fontWeight: 'bold', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)',
                          background: resultChoice === 'home_win' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          boxShadow: resultChoice === 'home_win' ? '0 0 15px var(--primary)' : 'none',
                          color: '#fff'
                        }}>
                        {match.home_team?.name}
                      </button>
                      <button type="button" onClick={() => setResultChoice('draw')} 
                        style={{ padding: '1rem', borderRadius: '12px', fontWeight: 'bold', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)',
                          background: resultChoice === 'draw' ? 'var(--warning)' : 'rgba(255,255,255,0.05)',
                          boxShadow: resultChoice === 'draw' ? '0 0 15px var(--warning)' : 'none',
                          color: resultChoice === 'draw' ? '#000' : '#fff'
                        }}>
                        HÒA
                      </button>
                      <button type="button" onClick={() => setResultChoice('away_win')} 
                        style={{ padding: '1rem', borderRadius: '12px', fontWeight: 'bold', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)',
                          background: resultChoice === 'away_win' ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                          boxShadow: resultChoice === 'away_win' ? '0 0 15px var(--danger)' : 'none',
                          color: '#fff'
                        }}>
                        {match.away_team?.name}
                      </button>
                    </div>
                  </div>

                  {/* Secondary Choice: Score */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>
                      2. Dự đoán Tỷ số chính xác (Tùy chọn)
                    </label>
                    
                    <div className="flex justify-center items-center gap-4 mt-4">
                      <input 
                        type="number" min="0" max="20" placeholder="-"
                        value={myPrediction.home} 
                        onChange={e => setMyPrediction({...myPrediction, home: e.target.value === '' ? '' : Number(e.target.value)})}
                        style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', width: '90px', height: '90px', borderRadius: '16px', color: '#fff' }}
                      />
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' }}>-</span>
                      <input 
                        type="number" min="0" max="20" placeholder="-"
                        value={myPrediction.away} 
                        onChange={e => setMyPrediction({...myPrediction, away: e.target.value === '' ? '' : Number(e.target.value)})}
                        style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', width: '90px', height: '90px', borderRadius: '16px', color: '#fff' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', marginTop: '0.5rem' }} disabled={saving}>
                {saving ? 'Đang lưu...' : 'XÁC NHẬN DỰ ĐOÁN'}
              </button>
            </form>
          )}
        </div>

        {/* Stats Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span style={{ color: 'var(--accent)' }}>●</span> Thống kê ({predictions.length} người đoán)
          </h3>
          
          {!isLocked ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.8, color: '#ccc', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
              <div style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>Thống kê sẽ được hiển thị sau khi <strong>Khóa dự đoán</strong><br/>nhằm đảm bảo tính công bằng và tránh ảnh hưởng tâm lý người chơi.</div>
            </div>
          ) : !isKnockout ? (
            <>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div style={{ width: '120px', fontWeight: 600 }}>{match.home_team?.name} thắng</div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '28px', borderRadius: '14px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: `${(stats.winHome / total) * 100}%`, background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', height: '100%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round((stats.winHome / total) * 100)}%</div>
                </div>

                <div className="flex items-center gap-4">
                  <div style={{ width: '120px', fontWeight: 600 }}>Hòa</div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '28px', borderRadius: '14px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: `${(stats.draw / total) * 100}%`, background: 'linear-gradient(90deg, var(--warning), #fde047)', height: '100%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round((stats.draw / total) * 100)}%</div>
                </div>

                <div className="flex items-center gap-4">
                  <div style={{ width: '120px', fontWeight: 600 }}>{match.away_team?.name} thắng</div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '28px', borderRadius: '14px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                    <div style={{ width: `${(stats.winAway / total) * 100}%`, background: 'linear-gradient(90deg, var(--danger), #f43f5e)', height: '100%', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round((stats.winAway / total) * 100)}%</div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--success)' }}>Top dự đoán tỷ số:</h4>
                {topScores.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {topScores.map(([score, count], i) => (
                      <div key={score} className="flex items-center gap-4">
                        <div style={{ width: '60px', fontWeight: 'bold', fontSize: '1.1rem', color: i === 0 ? 'var(--warning)' : 'white' }}>{score}</div>
                        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / total) * 100}%`, background: i === 0 ? 'var(--warning)' : 'var(--primary)', height: '100%' }}></div>
                        </div>
                        <div style={{ width: '50px', textAlign: 'right', fontSize: '0.9rem', opacity: 0.8 }}>{Math.round((count / total) * 100)}%</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, fontStyle: 'italic', fontSize: '0.95rem' }}>Chưa có dự đoán tỷ số nào.</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-8">
              <div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--success)' }}>Đội đi tiếp:</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div style={{ width: '120px', fontWeight: 600 }}>{match.home_team?.name}</div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${(statsKnockout.homeAdvancing / total) * 100}%`, background: 'var(--primary)', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round((statsKnockout.homeAdvancing / total) * 100)}%</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div style={{ width: '120px', fontWeight: 600 }}>{match.away_team?.name}</div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${(statsKnockout.awayAdvancing / total) * 100}%`, background: 'var(--danger)', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round((statsKnockout.awayAdvancing / total) * 100)}%</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--warning)' }}>Hình thức chiến thắng:</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div style={{ width: '80px', fontSize: '0.9rem' }}>90 Phút</div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${(statsKnockout.win90 / total) * 100}%`, background: '#3b82f6', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '40px', textAlign: 'right', fontSize: '0.8rem' }}>{Math.round((statsKnockout.win90 / total) * 100)}%</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div style={{ width: '80px', fontSize: '0.9rem' }}>Hiệp phụ</div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${(statsKnockout.win120 / total) * 100}%`, background: '#8b5cf6', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '40px', textAlign: 'right', fontSize: '0.8rem' }}>{Math.round((statsKnockout.win120 / total) * 100)}%</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div style={{ width: '80px', fontSize: '0.9rem' }}>Luân lưu</div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${(statsKnockout.winPen / total) * 100}%`, background: '#f59e0b', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '40px', textAlign: 'right', fontSize: '0.8rem' }}>{Math.round((statsKnockout.winPen / total) * 100)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isLocked && predictions.length > 0 && (
            <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--success)' }}>Lựa chọn của mọi người:</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '1rem' }} className="flex flex-col gap-2">
                {predictions.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-3 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{p.profiles?.display_name}</span>
                    <div style={{ textAlign: 'right' }}>
                      {!isKnockout ? (
                        <>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', color: p.prediction_result === 'home_win' ? 'var(--primary)' : p.prediction_result === 'away_win' ? 'var(--danger)' : 'var(--warning)' }}>
                            {p.prediction_result === 'home_win' ? match.home_team?.name : p.prediction_result === 'away_win' ? match.away_team?.name : 'HÒA'}
                          </div>
                          {p.home_score !== null && p.away_score !== null && (
                            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>Tỷ số: {p.home_score} - {p.away_score}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', color: p.advancing_team_id === match.home_team_id ? 'var(--primary)' : 'var(--danger)' }}>
                            {p.advancing_team_id === match.home_team_id ? match.home_team?.name : match.away_team?.name}
                          </div>
                          <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>
                            {p.predicted_win_method === '90_mins' ? "Thắng trong 90'" : p.predicted_win_method === 'extra_time' ? "Thắng Hiệp phụ" : "Thắng Luân lưu"}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
