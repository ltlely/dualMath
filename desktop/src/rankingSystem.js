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

// Matchmaking + auto difficulty helpers

export function getSafeRankPoints(playerOrPoints) {
  if (typeof playerOrPoints === "number") {
    return Math.max(0, Math.min(1100, playerOrPoints));
  }

  if (typeof playerOrPoints?.rankPoints === "number") {
    return Math.max(0, Math.min(1100, playerOrPoints.rankPoints));
  }

  return 0;
}

export function getLobbyAveragePoints(players = []) {
  if (!players.length) return 0;

  const total = players.reduce((sum, player) => {
    return sum + getSafeRankPoints(player);
  }, 0);

  return total / players.length;
}

export function getLobbyPointSpread(players = []) {
  if (!players.length) return 0;

  const points = players.map(getSafeRankPoints);
  return Math.max(...points) - Math.min(...points);
}

export function getAutoDifficulty(players = []) {
  const avg = getLobbyAveragePoints(players);
  const spread = getLobbyPointSpread(players);

  let diff = "easy";

  if (avg >= 901) {
    diff = "hard";
  } else if (avg >= 601) {
    diff = "medium";
  } else {
    diff = "easy";
  }

  // soften extreme mismatch lobbies
  // example: 1 King + 3 Novice should not instantly feel like a hard lobby
  if (spread >= 500 && avg < 901 && diff === "hard") {
    diff = "medium";
  }

  return diff;
}

export function getDefaultMatchSettings(players = []) {
  return {
    diff: getAutoDifficulty(players),
    roundMs: 11000,
    totalRounds: 11,
  };
}

export function getRankMatchBucket(points) {
  const safePoints = getSafeRankPoints(points);

  if (safePoints <= 400) return "low";
  if (safePoints <= 700) return "mid";
  if (safePoints <= 1100) return "high";
  return "low";
}

export function canJoinRandomLobby(playerA, playerB) {
  const a = getSafeRankPoints(playerA);
  const b = getSafeRankPoints(playerB);
  const diff = Math.abs(a - b);

  // stricter for low ranks, looser for higher ranks
  if (a <= 400 && b <= 400) return diff <= 150;
  if (a <= 700 && b <= 700) return diff <= 200;
  return diff <= 250;
}

export function isPlayerCompatibleWithRoom(player, roomPlayers = []) {
  if (!roomPlayers.length) return true;

  const playerPoints = getSafeRankPoints(player);
  const roomAvg = getLobbyAveragePoints(roomPlayers);

  // allow joining if reasonably close to current room average
  return Math.abs(playerPoints - roomAvg) <= 250;
}