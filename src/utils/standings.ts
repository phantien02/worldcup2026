export const resolvePlaceholderTeam = (teamName: string | undefined, allMatches: any[]) => {
  if (!teamName) return null;
  const nameLower = teamName.toLowerCase();
  
  if (nameLower.startsWith('nhất bảng') || nameLower.startsWith('nhì bảng') || nameLower.startsWith('ba bảng')) {
    const isFirst = nameLower.startsWith('nhất');
    const isSecond = nameLower.startsWith('nhì');
    const isThird = nameLower.startsWith('ba');
    
    // Extract group name: "Nhất Bảng A" -> "Bảng A"
    const parts = teamName.split(' ');
    // Handle cases where they might type "Nhất bảng A" or "Nhất Bảng A"
    const groupName = "Bảng " + parts[parts.length - 1].toUpperCase(); 
    
    // Calculate standings for this group
    const groupMatches = allMatches.filter(m => m.round?.toLowerCase() === groupName.toLowerCase());
    
    if (groupMatches.length > 0) {
      const teams: Record<string, any> = {};
      groupMatches.forEach(m => {
        const h = m.home_team?.name;
        const a = m.away_team?.name;
        if (!h || !a) return;
        if (!teams[h]) teams[h] = { name: h, flag_url: m.home_team?.flag_url, pts: 0, gd: 0, gf: 0, p: 0 };
        if (!teams[a]) teams[a] = { name: a, flag_url: m.away_team?.flag_url, pts: 0, gd: 0, gf: 0, p: 0 };
        
        if (m.status === 'finished') {
          teams[h].p += 1; teams[a].p += 1;
          teams[h].gf += m.home_score; teams[a].gf += m.away_score;
          teams[h].gd += (m.home_score - m.away_score);
          teams[a].gd += (m.away_score - m.home_score);
          if (m.home_score > m.away_score) teams[h].pts += 3;
          else if (m.home_score < m.away_score) teams[a].pts += 3;
          else { teams[h].pts += 1; teams[a].pts += 1; }
        }
      });
      
      const sortedTeams = Object.values(teams).sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        if (a.gd !== b.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });
      
      // Assume a group is finished if there are 6 matches and all are finished (World Cup groups have 4 teams)
      const isFinished = groupMatches.length === 6 && groupMatches.every(m => m.status === 'finished');
      
      if (isFinished && sortedTeams.length > 0) {
        if (isFirst && sortedTeams[0]) return sortedTeams[0];
        if (isSecond && sortedTeams[1]) return sortedTeams[1];
        if (isThird && sortedTeams[2]) return sortedTeams[2];
      }
    }
  }
  
  return null; // Could not resolve
};
