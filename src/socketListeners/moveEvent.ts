import { Socket } from "socket.io";
import { activeGames } from "../socket/onConnection";
import { moveData, SocketEvent } from "../types/types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const moveEvent = (
  move: moveData,
  history: string[],
  gameId: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const game = activeGames.get(gameId);
  if (game) {
    game.history = history;
  }

  if (game?.playersUsernames[0]) {
    const tournament = findTournamentByUsername(game?.playersUsernames[0]);
    if (tournament?.increment) {
      if (game.isWhiteMove) {
        game.clocks[0] = game.clocks[0] + tournament?.increment;
      } else {
        game.clocks[1] = game.clocks[1] + tournament?.increment;
      }
      game.isWhiteMove = !game.isWhiteMove;
    }
  }
  
  if (!game) {
    socket.broadcast.emit(SocketEvent.PLAYER_MOVE, { move, history });
  } else {
    socket.to(gameId).emit(SocketEvent.PLAYER_MOVE, { move, history });
  }
};
