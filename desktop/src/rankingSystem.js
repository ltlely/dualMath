// Ranking system for math game with 6 ranks from Novice to King
// Points range: 0-1100 across all ranks

export const RANKS = [
  { name: 'Novice', minPoints: 0, maxPoints: 300 },
  { name: 'Apprentice', minPoints: 301, maxPoints: 400 },
  { name: 'Skilled', minPoints: 401, maxPoints: 600 },
  { name: 'Professional', minPoints: 601, maxPoints: 700 },
  { name: 'Expert', minPoints: 701, maxPoints: 900 },
  { name: 'King', minPoints: 901, maxPoints: 1100 }
];

// Get current rank based on points
export function getRank(points) {
  const normalizedPoints = Math.max(0, Math.min(1100, points || 0));
  
  for (let rank of RANKS) {
    if (normalizedPoints >= rank.minPoints && normalizedPoints <= rank.maxPoints) {
      return rank.name;
    }
  }
  
  return normalizedPoints > 1100 ? 'King' : 'Novice';
}

// Calculate points to award for a win based on current rank
export function getWinPoints(currentPoints) {
  const rank = getRank(currentPoints);
  
  // Novice and Apprentice get 80 points per win
  if (rank === 'Novice' || rank === 'Apprentice') {
    return 80;
  }
  
  // Skilled and above get 50 points per win
  return 50;
}

// Calculate points to deduct for a loss based on current rank
export function getLossPoints(currentPoints) {
  const rank = getRank(currentPoints);
  
  // If Novice with 0 points, no deduction
  if (rank === 'Novice' && (currentPoints || 0) === 0) {
    return 0;
  }
  
  // Novice loses 20 points
  if (rank === 'Novice') {
    return 20;
  }
  
  // All other ranks lose 30 points
  return 30;
}

// Update points after a game (win or loss)
export function updatePoints(currentPoints, won) {
  let newPoints = currentPoints || 0;
  
  if (won) {
    newPoints += getWinPoints(currentPoints);
  } else {
    newPoints -= getLossPoints(currentPoints);
  }
  
  // Ensure points stay within valid range [0, 1100]
  return Math.max(0, Math.min(1100, newPoints));
}

// Get progress percentage within current rank (0-100)
export function getRankProgress(points) {
  const normalizedPoints = Math.max(0, Math.min(1100, points || 0));
  const rank = getRank(normalizedPoints);
  const rankData = RANKS.find(r => r.name === rank);
  
  if (!rankData) return 100;
  
  const rangeSize = rankData.maxPoints - rankData.minPoints;
  const pointsIntoRank = normalizedPoints - rankData.minPoints;
  const progress = (pointsIntoRank / rangeSize) * 100;
  
  return Math.min(100, Math.max(0, progress));
}

// Get the next rank name (or null if already King)
export function getNextRank(currentPoints) {
  const currentRank = getRank(currentPoints);
  const currentIndex = RANKS.findIndex(r => r.name === currentRank);
  
  if (currentIndex >= 0 && currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1].name;
  }
  
  return null;
}

// Get points needed to reach next rank
export function getPointsToNextRank(currentPoints) {
  const normalizedPoints = Math.max(0, Math.min(1100, currentPoints || 0));
  const currentRank = getRank(normalizedPoints);
  const rankData = RANKS.find(r => r.name === currentRank);
  
  if (!rankData || currentRank === 'King') {
    return 0;
  }
  
  return rankData.maxPoints - normalizedPoints + 1;
}
