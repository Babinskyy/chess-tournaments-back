import { activeGames, activePlayers } from "../socket/onConnection";
import { SocketEvent } from "../types/types";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { io } from "../..";

export const drawOffer = (playerUsername: string, gameId: string) => {
  const game = activeGames.get(gameId);
  if (game) {

    const opponentUsername = game.playersUsernames.find(
      (u) => playerUsername !== u
    );

    if (opponentUsername) {
      const opponent = findPlayerByUsername(opponentUsername, activePlayers);
      if (opponent) {
        io.to(opponent.id).emit(SocketEvent.OFFER_DRAW);
      }
    }
  }
};
