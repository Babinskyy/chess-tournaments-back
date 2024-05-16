import { getUsersArray } from "../utils/getUsersArray";
import { io } from "../..";
import { activeGames, activeUsers, allUsers } from "./onConnection";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { PlayerStatus } from "../types/types.types";

export const finishGame = (game: string, result: string, reason: string) => {
  activeGames.get(game)?.playersUsernames.forEach((playerUsername) => {
    const player = findPlayerByUsername(playerUsername, allUsers);
    if (player) {
      player.status = PlayerStatus.NOT_STARTED;
    }
  });
  activeGames.get(game)?.spectators.forEach((spectator) => {
    const player = findPlayerByUsername(spectator, allUsers);
    if (player) {
      player.status = PlayerStatus.NOT_STARTED;
    }
  });
  activeGames.delete(game);
  io.to(game).emit("finish-game", { result, reason });
  io.emit("users-list-update", getUsersArray(activeUsers));
};
