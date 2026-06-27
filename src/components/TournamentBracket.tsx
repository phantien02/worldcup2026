import React from 'react';
import styles from './TournamentBracket.module.css';
import Image from 'next/image';

import { resolvePlaceholderTeam } from '@/utils/standings';

interface Team {
  name: string;
  flag_url?: string;
}

interface Match {
  id: string;
  matchNumber?: number;
  home_team: Team;
  away_team: Team;
  home_score: number | null;
  away_score: number | null;
  status: string;
  kickoff_time: string;
}

interface TournamentBracketProps {
  matches: Match[];
}

export default function TournamentBracket({ matches }: TournamentBracketProps) {
  // Map matches by their matchNumber for O(1) lookup
  const matchMap = new Map<number, Match>();
  matches.forEach(m => {
    if (m.matchNumber !== undefined) matchMap.set(m.matchNumber, m);
  });

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const isPlaceholderName = (name: string) => /^(nhất|nhì|ba|thứ\s*3|thắng|thua)\s/i.test(name);
  const getTeamInfo = (teamData: Team | undefined) => {
    if (!teamData) return { name: 'TBD', flag: null };
    const resolved = resolvePlaceholderTeam(teamData.name, matches as any);
    if (resolved) {
      return { name: resolved.name, flag: resolved.flag_url };
    }
    if (isPlaceholderName(teamData.name)) {
      return { name: teamData.name, flag: null };
    }
    return { name: teamData.name, flag: teamData.flag_url };
  };

  const MatchCard = ({ num, isRight = false }: { num: number, isRight?: boolean }) => {
    const m = matchMap.get(num);
    
    // Calculate if team is winner
    const homeWon = m?.status === 'finished' && m.home_score !== null && m.away_score !== null && m.home_score > m.away_score;
    const awayWon = m?.status === 'finished' && m.home_score !== null && m.away_score !== null && m.away_score > m.home_score;
    const isDraw = m?.status === 'finished' && m.home_score !== null && m.away_score !== null && m.home_score === m.away_score;

    const home = getTeamInfo(m?.home_team);
    const away = getTeamInfo(m?.away_team);

    return (
      <div className={`${styles.matchWrapper} ${isRight ? styles.rightSide : styles.leftSide}`}>
        <div className={styles.matchConnector}></div>
        <div className={styles.matchCard}>
          <div className={styles.matchHeader}>
            <span className={styles.matchNumber}>W{num}</span>
            {m ? <span className={styles.matchTime}>{formatTime(m.kickoff_time)}</span> : <span className={styles.matchTime}>Chưa có lịch</span>}
          </div>
          <div className={styles.matchBody}>
            <div className={`${styles.team} ${homeWon || isDraw ? styles.winner : ''}`}>
              <div className={styles.teamInfo}>
                {home.flag ? (
                  <img src={home.flag} alt="flag" className={styles.flag} />
                ) : (
                  <div className={styles.flagPlaceholder}></div>
                )}
                <span className={styles.teamName} title={home.name}>{home.name}</span>
              </div>
              <span className={styles.score}>{m?.status === 'finished' ? m.home_score : '-'}</span>
            </div>
            <div className={`${styles.team} ${awayWon || isDraw ? styles.winner : ''}`}>
              <div className={styles.teamInfo}>
                {away.flag ? (
                  <img src={away.flag} alt="flag" className={styles.flag} />
                ) : (
                  <div className={styles.flagPlaceholder}></div>
                )}
                <span className={styles.teamName} title={away.name}>{away.name}</span>
              </div>
              <span className={styles.score}>{m?.status === 'finished' ? m.away_score : '-'}</span>
            </div>
          </div>
        </div>
      </div>
  const FinalMatchCard = ({ num }: { num: number }) => {
    const m = matchMap.get(num);
    
    // Calculate if team is winner
    const homeWon = m?.status === 'finished' && m.home_score !== null && m.away_score !== null && m.home_score > m.away_score;
    const awayWon = m?.status === 'finished' && m.home_score !== null && m.away_score !== null && m.away_score > m.home_score;
    
    const home = getTeamInfo(m?.home_team);
    const away = getTeamInfo(m?.away_team);

    return (
      <div className={styles.finalMatchWrapper}>
        <div className={styles.finalMatchCard}>
          <div className={styles.finalHeader}>
            <div className={styles.trophyContainer}>
              <div className={styles.trophyIcon}>🏆</div>
            </div>
            <div className={styles.finalTitle}>CHUNG KẾT</div>
            {m ? <div className={styles.finalTime}>{formatTime(m.kickoff_time)}</div> : <div className={styles.finalTime}>Chưa có lịch</div>}
          </div>
          <div className={styles.finalBody}>
            <div className={`${styles.finalTeam} ${homeWon ? styles.winner : ''}`}>
              {home.flag ? (
                <img src={home.flag} alt="flag" className={styles.finalFlag} />
              ) : (
                <div className={styles.finalFlagPlaceholder}></div>
              )}
              <span className={styles.finalTeamName}>{home.name}</span>
            </div>
            
            <div className={styles.finalScoreBox}>
              <span className={styles.finalScore}>{m?.status === 'finished' ? m.home_score : '-'}</span>
              <span className={styles.finalScoreDivider}>:</span>
              <span className={styles.finalScore}>{m?.status === 'finished' ? m.away_score : '-'}</span>
            </div>
            
            <div className={`${styles.finalTeam} ${awayWon ? styles.winner : ''}`}>
              <span className={styles.finalTeamName}>{away.name}</span>
              {away.flag ? (
                <img src={away.flag} alt="flag" className={styles.finalFlag} />
              ) : (
                <div className={styles.finalFlagPlaceholder}></div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracketScroll}>
        
        {/* LEFT BRACKET */}
        <div className={styles.bracketHalf}>
          <div className={styles.round}>
            <MatchCard num={74} />
            <MatchCard num={77} />
            <MatchCard num={73} />
            <MatchCard num={75} />
            <MatchCard num={83} />
            <MatchCard num={84} />
            <MatchCard num={81} />
            <MatchCard num={82} />
          </div>
          <div className={styles.round}>
            <MatchCard num={89} />
            <MatchCard num={90} />
            <MatchCard num={93} />
            <MatchCard num={94} />
          </div>
          <div className={styles.round}>
            <MatchCard num={97} />
            <MatchCard num={98} />
          </div>
          <div className={styles.round}>
            <MatchCard num={101} />
          </div>
        </div>

        {/* CENTER FINAL */}
        <div className={styles.bracketCenter}>
          <FinalMatchCard num={104} />
        </div>

        {/* RIGHT BRACKET */}
        <div className={`${styles.bracketHalf} ${styles.bracketHalfRight}`}>
          <div className={styles.round}>
            <MatchCard num={76} isRight />
            <MatchCard num={78} isRight />
            <MatchCard num={79} isRight />
            <MatchCard num={80} isRight />
            <MatchCard num={86} isRight />
            <MatchCard num={88} isRight />
            <MatchCard num={85} isRight />
            <MatchCard num={87} isRight />
          </div>
          <div className={styles.round}>
            <MatchCard num={91} isRight />
            <MatchCard num={92} isRight />
            <MatchCard num={95} isRight />
            <MatchCard num={96} isRight />
          </div>
          <div className={styles.round}>
            <MatchCard num={99} isRight />
            <MatchCard num={100} isRight />
          </div>
          <div className={styles.round}>
            <MatchCard num={102} isRight />
          </div>
        </div>

      </div>
    </div>
  );
}
