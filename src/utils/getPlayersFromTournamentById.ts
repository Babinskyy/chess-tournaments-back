import { activeTournaments, activeUsers } from "../socket/onConnection";
import { TemporaryPlayer, User } from "../types/types.types";
import { getUsersArray } from "./getUsersArray";

export const getPlayersFromTournamentById = (tournamentId: string): User[] => {
  const tournamentWithParticipants = Array.from(activeTournaments).find(
    (tournament) => tournament.id === tournamentId
  );

  if (!tournamentWithParticipants) {
    return [];
  }

  const usernamesInTournament = tournamentWithParticipants.playersUsernames;

  const playersInTournament = getUsersArray(activeUsers).filter(
    (player) =>
      usernamesInTournament.includes(player.username) &&
      player.id !== TemporaryPlayer.ID
  );

  return playersInTournament;
};
