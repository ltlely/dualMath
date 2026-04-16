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

  if (avg >= 901) diff = "hard";
  else if (avg >= 601) diff = "med";
  else diff = "easy";

  if (spread >= 500 && avg < 901 && diff === "hard") {
    diff = "med";
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

export function isPlayerCompatibleWithRoom(player, roomPlayers = []) {
  if (!roomPlayers.length) return true;

  const playerPoints = getSafeRankPoints(player);
  const roomAvg = getLobbyAveragePoints(roomPlayers);

  return Math.abs(playerPoints - roomAvg) <= 250;
}