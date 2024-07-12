import { Player, PlayerStatus } from "../types/types";
import { activePlayers } from "../socket/onConnection";

export const updatePlayerStatus = (player: Player, status: PlayerStatus) => {

  activePlayers.forEach((activePlayer) => {
    if (activePlayer.username === player.username) {
      activePlayer.status = status;
    }
  });
};
