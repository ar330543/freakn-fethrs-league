export function computePlayerStandings(players) {
  return [...players].sort((a, b) =>
    (b.wins || 0) - (a.wins || 0) ||
    (b.pointDiff || 0) - (a.pointDiff || 0) ||
    (b.pointsFor || 0) - (a.pointsFor || 0) ||
    a.name.localeCompare(b.name)
  );
}
