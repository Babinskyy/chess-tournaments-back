import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { activeGames, allPlayers } from "../socket/onConnection";
import { PlayerStatus, SocketEvent, TournamentType } from "../types/types";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { v4 } from "uuid";
import { INITIAL_FEN } from "../constansts/constants";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { startCountdown } from "../socket/startCountdown";
import { io } from "../..";
import { updateAdminManager } from "../functions/updateAdminManager";

export const joinGame = (
  player: string,
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  let game: string | undefined;
  let playersUsernames: string[] | undefined;

  const tournament1 = findTournamentByUsername(player);
  const playerObj = findPlayerByUsername(player, allPlayers);

  if (tournament1?.type === TournamentType.FFA && playerObj) {
    const allPlayersInTournament = getPlayersFromTournamentById(
      tournament1.id
    ).filter(
      (tournamentPlayer) =>
        tournamentPlayer.username !== player &&
        tournamentPlayer.isDeleted !== true
    );

    if (playerObj.playersPlayed.length >= allPlayersInTournament.length) {
      playerObj.playersPlayed = [];
    }

    for (const [gameId, gameData] of activeGames) {
      if (gameData.playersUsernames.length < 2) {
        const existingPlayerUsername = gameData.playersUsernames[0];
        const tournament2 = findTournamentByUsername(existingPlayerUsername);
        const existingPlayer = findPlayerByUsername(
          existingPlayerUsername,
          allPlayers
        );

        if (
          tournament1?.id === tournament2?.id &&
          existingPlayer &&
          !existingPlayer.playersPlayed.includes(player) &&
          !playerObj.playersPlayed.includes(existingPlayerUsername)
        ) {
          game = gameId;
          socket.emit(SocketEvent.SET_GAME, game);
          playersUsernames = gameData.playersUsernames;
          break;
        }
      }
    }

    if (!game && tournament1) {
      game = v4();
      socket.emit(SocketEvent.SET_GAME, game);
      playersUsernames = [];

      activeGames.set(game, {
        fen: INITIAL_FEN,
        playersUsernames: playersUsernames,
        clocks: [tournament1.time * 60, tournament1.time * 60],
        isWhiteMove: true,
        spectators: [],
      });

      const activePlayer = findPlayerByUsername(player, allPlayers);
      if (activePlayer) {
        updatePlayerStatus(activePlayer, PlayerStatus.WAITING);
      }
    }

    if (playersUsernames) {
      playersUsernames.push(player);
      socket.join(game!);
      if (playersUsernames.length === 2) {
        const player0 = findPlayerByUsername(playersUsernames[0], allPlayers);
        const player1 = findPlayerByUsername(playersUsernames[1], allPlayers);

        if (player0 && player1) {
          updatePlayerStatus(player0, PlayerStatus.IN_GAME);
          updatePlayerStatus(player1, PlayerStatus.IN_GAME);
        }
        if (game) {
          startCountdown(game, activeGames);
        }
      }

      const tournamentId = findTournamentByUsername(player)?.id;
      if (tournamentId) {
        io.to(tournamentId).emit(
          SocketEvent.USERS_LIST_UPDATE,
          getPlayersFromTournamentById(tournamentId)
        );
        io.to(game!).emit(SocketEvent.PLAYER_JOIN, playersUsernames);
      }
    }
  }

  updateAdminManager();
};
