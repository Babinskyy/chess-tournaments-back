import { Tournament } from "../types/types.types";

export const findTournamentByTournamentId = (
  tournamentId: string,
  activeTournaments: Set<Tournament>
): Tournament | undefined => {
  const tournament = Array.from(activeTournaments).find(
    (t) => t.id === tournamentId
  );

  if (tournament) {
    return tournament;
  }

  return undefined;
};
