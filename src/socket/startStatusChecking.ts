import { io } from "../..";
import { PlayerStatus, SocketEvent } from "../types/types.types";
import { findGameByUsername } from "../utils/findGameByUsername";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { getUsersArray } from "../utils/getUsersArray";
import { finishGame } from "./finishGame";
import {
  activeGames,
  activeUsers,
  allUsers,
  disconnectTimeouts,
} from "./onConnection";
import { addPoints } from "./addPoints";

const USER_DELETION_TIME = 30000;

export const startStatusChecking = (playerUsername: string) => {
  const disconnectTimeout = setTimeout(() => {
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
        activeUsers.forEach((user) => {
          if (player === user) {
            user.isDeleted = true;
          }
        });
        allUsers.forEach((user) => {
          if (player === user) {
            user.isDeleted = true;
          }
        });

        if (temporaryPlayer) {
          allUsers.delete(temporaryPlayer);
        }
        if (game) {
          const isPlayerWhite =
            playerUsername === activeGames.get(game)?.playersUsernames[0];

          const finishedGame = activeGames.get(game);

          if (finishedGame) {
            const winner = isPlayerWhite
              ? finishedGame.playersUsernames[1]
              : finishedGame.playersUsernames[0];

            addPoints(activeUsers, winner, game, activeGames);
          }
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

  disconnectTimeouts.set(playerUsername, disconnectTimeout);
};
