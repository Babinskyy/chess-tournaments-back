import { io } from "../..";
import { activeGames } from "../socket/onConnection";
import { SocketEvent } from "../types/types";

export const declineDraw = (game: string) => {
  const gameInfo = activeGames.get(game);
  if (gameInfo) {
  }
  io.to(game).emit(SocketEvent.DRAW_DECLINED);
};
