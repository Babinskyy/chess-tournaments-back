import { activeTournaments, activePlayers } from "../socket/onConnection";
import { TemporaryPlayer, Player } from "../types/types.types";
import { getUsernamesFromTournament } from "./getUsernamesFromTournament";
import { getUsersArray } from "./getUsersArray";

export const getPlayersFromTournamentById = (
  tournamentId: string
): Player[] => {
  const tournamentWithParticipants = Array.from(activeTournaments).find(
    (tournament) => tournament.id === tournamentId
  );

  if (!tournamentWithParticipants) {
    return [];
  }

  const usernamesInTournament = getUsernamesFromTournament(
    tournamentWithParticipants
  );

  const playersInTournament = getUsersArray(activePlayers).filter(
    (player) =>
      usernamesInTournament.includes(player.username) &&
      player.id !== TemporaryPlayer.ID
  );

  return playersInTournament;
};
