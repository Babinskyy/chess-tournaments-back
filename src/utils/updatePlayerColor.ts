import { Color, Player } from "../types/types";
import { activePlayers } from "../socket/onConnection";

export const updatePlayerColor = (player: Player, color: Color) => {
  activePlayers.forEach((activePlayer) => {
    if (activePlayer.username === player.username) {
      activePlayer.colors.push(color);
    }
  });
};
