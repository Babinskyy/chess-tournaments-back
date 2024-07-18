import { io } from "../..";
import {
  Color,
  GameFinishReason,
  PlayerStatus,
  SocketEvent,
} from "../types/types";
import { findGameIdByUsername } from "../utils/findGameIdByUsername";
import { findTemporaryPlayerByUsername } from "../utils/findTemporaryPlayerByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { finishGame } from "./finishGame";
import {
  activeGames,
  activeTournaments,
  activePlayers,
  allPlayers,
  disconnectTimeouts,
} from "./onConnection";
import { addPoints } from "./addPoints";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { getUsernamesFromTournament } from "../utils/getUsernamesFromTournament";
import { deletePlayer } from "../utils/deleteUser";
import { updatePlayerColor } from "../utils/updatePlayerColor";

const USER_DELETION_TIME = 30000;

export const startStatusChecking = (playerUsername: string) => {
  const disconnectTimeout = setTimeout(() => {
    try {
      const player = findPlayerByUsername(playerUsername, activePlayers);
      const temporaryPlayer = findTemporaryPlayerByUsername(
        playerUsername,
        allPlayers
      );
      const game = findGameIdByUsername(playerUsername, activeGames);

      if (!player || player?.status !== PlayerStatus.DISCONNECTED) {
        return;
      }

      if (player?.status === PlayerStatus.DISCONNECTED) {
        activePlayers.forEach((user) => {
          if (player === user) {
            deletePlayer(user);
          }
        });

        allPlayers.forEach((user) => {
          if (player === user) {
            user.isDeleted = true;
          }
        });

        if (temporaryPlayer) {
          allPlayers.delete(temporaryPlayer);
        }

        if (game) {
          const isPlayerWhite =
            playerUsername === activeGames.get(game)?.playersUsernames[0];

          const finishedGame = activeGames.get(game);

          if (finishedGame) {
            const winner = isPlayerWhite
              ? finishedGame.playersUsernames[1]
              : finishedGame.playersUsernames[0];

            const opponent = findPlayerByUsername(winner, activePlayers);
            if (opponent) {
              updatePlayerColor(
                opponent,
                isPlayerWhite ? Color.BLACK : Color.WHITE
              );
            }

            addPoints(winner, game);
          }
          finishGame(
            game,
            !isPlayerWhite ? "white" : "black",
            GameFinishReason.opponentDisconnect
          );
        }

        const tournament = findTournamentByUsername(playerUsername);

        if (tournament?.id) {
          const playersInTournament = getPlayersFromTournamentById(
            tournament?.id
          );

          const isAnyPlayerActive = Array.from(playersInTournament).some(
            (player) => player.isDeleted === false
          );

          if (isAnyPlayerActive) {
            io.to(tournament?.id).emit(
              SocketEvent.USERS_LIST_UPDATE,
              playersInTournament
            );
          } else {
            const usernamesInTournament =
              getUsernamesFromTournament(tournament);

            activePlayers.forEach((player) => {
              if (usernamesInTournament.includes(player.username)) {
                activePlayers.delete(player);
              }
            });
            allPlayers.forEach((player) => {
              if (usernamesInTournament.includes(player.username)) {
                allPlayers.delete(player);
              }
            });
            activeTournaments.delete(tournament);
          }
        }
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    }
  }, USER_DELETION_TIME);

  disconnectTimeouts.set(playerUsername, disconnectTimeout);
};
