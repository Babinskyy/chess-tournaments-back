import { activePlayers, activeTournaments } from "../socket/onConnection";
import { Player } from "../types/types";
import { findTournamentByUsername } from "./findTournamentByUsername";

export const deletePlayer = (player: Player) => {
  activePlayers.forEach((activePlayer) => {
    if (activePlayer.username === player.username) {
      activePlayer.isDeleted = true;
    }
  });

  const tournament = findTournamentByUsername(player.username);
  activeTournaments.forEach((activeTournament) => {
    if (activeTournament.id === tournament?.id) {
      tournament.players.forEach((tournamentPlayer) => {
        if (tournamentPlayer.username === player.username) {
          tournamentPlayer.isDeleted = true;
        }
      });
    }
  });
};
