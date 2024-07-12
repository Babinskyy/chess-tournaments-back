import { activeTournaments } from "../socket/onConnection"
import { Player } from "../types/types"

export const replaceTournamentPlayer = (player: Player, newPlayer: Player) => {
    activeTournaments.forEach((tournament) => {
      const playerIndex = tournament.players.findIndex(tournamentPlayer => player.username === tournamentPlayer.username);
  
      if (playerIndex !== -1) {
        tournament.players.splice(playerIndex, 1, newPlayer);
      }
    });
  };