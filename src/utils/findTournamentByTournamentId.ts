import { activeTournaments } from "../socket/onConnection";
import { Tournament } from "../types/types.types";

export const findTournamentByTournamentId = (
  tournamentId: string
): Tournament | undefined => {
  const tournament = Array.from(activeTournaments).find(
    (t) => t.id === tournamentId
  );

  if (tournament) {
    return tournament;
  }

  return undefined;
};
