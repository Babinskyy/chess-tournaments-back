import { Player, PlayerStatus } from "../types/types.types";
import { findTournamentByUsername } from "./findTournamentByUsername";
import { activePlayers, activeTournaments } from "../socket/onConnection";

export const updatePlayerStatus = (player: Player, status: PlayerStatus) => {
  const tournament = findTournamentByUsername(player.username);

  activeTournaments.forEach((searchedTournament) => {
    if (searchedTournament.id === tournament?.id) {
      searchedTournament?.players.forEach((playerInTournament) => {
        if (playerInTournament.username === player.username) {
          playerInTournament.status = status;
        }
      });
    }
  });

  activePlayers.forEach((activeUser) => {
    if (activeUser.username === player.username) {
      activeUser.status = status;
    }
  });
};
