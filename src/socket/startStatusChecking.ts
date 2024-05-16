import { io } from "../..";
import {
  PlayerStatus,
  SocketEvent,
  TemporaryPlayer,
} from "../types/types.types";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { getUsersArray } from "../utils/getUsersArray";
import { finishGame } from "./finishGame";
import { activeGames, activeUsers, allUsers } from "./onConnection";

const USER_DELETION_TIME = 30000;

export const startStatusChecking = (playerUsername: string) => {
  setTimeout(() => {
    try {
      const player = findPlayerByUsername(playerUsername, activeUsers);
      const temporaryPlayer = findTemporaryPlayerByUsername(
        playerUsername,
        allUsers
      );
      const game = findGameByUsername(playerUsername, activeGames);

      if (!player || player?.status !== PlayerStatus.DISCONNECTED) {
        return;
      }
      if (player?.status === PlayerStatus.DISCONNECTED) {
        activeUsers.delete(player);
        allUsers.delete(player);
        if (temporaryPlayer) {
          allUsers.delete(temporaryPlayer);
        }
        if (game) {
          const isPlayerWhite =
            playerUsername === activeGames.get(game)?.playersUsernames[0];
          finishGame(
            game,
            !isPlayerWhite ? "white" : "black",
            "opponent disconnect"
          );
        }
        io.emit(SocketEvent.USERS_LIST_UPDATE, getUsersArray(activeUsers));
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    }
  }, USER_DELETION_TIME);
};
