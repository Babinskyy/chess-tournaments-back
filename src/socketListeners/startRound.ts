import { v4 } from "uuid";
import { INITIAL_FEN } from "../constansts/constants";
import {
  activeGames,
  activePlayers,
  activeTournaments,
  allPlayers,
} from "../socket/onConnection";
import { Match } from "../swiss/swiss.types";
import { findTournamentByTournamentId } from "../utils/findTournamentByTournamentId";
import { generateSwissPairings } from "../utils/generateSwissPairing";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { io } from "../..";
import { PlayerStatus, SocketEvent } from "../types/types";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { startCountdown } from "../socket/startCountdown";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updateAdminManager } from "../functions/updateAdminManager";
import { addPoints } from "../socket/addPoints";

export const startRound = (tournamentId: string) => {
  activeTournaments.forEach((t) => {
    if (t.id === tournamentId) {
      t.currentRound = t.currentRound + 1;
    }
  });

  const tournament = findTournamentByTournamentId(tournamentId);
  let pairings: Match[] | null = null;
  const tournamentPlayers = tournament?.players;

  if (tournamentPlayers) {
    pairings = generateSwissPairings(
      tournamentPlayers,
      tournament?.currentRound
    );
  }

  pairings?.forEach((pairing) => {
    if (pairing.player2 === null) {
      const byePlayerUsername = pairing.player1;
      if (byePlayerUsername && typeof byePlayerUsername === "string") {
        const byePlayer = findPlayerByUsername(byePlayerUsername, allPlayers);
        if (byePlayer) {
          byePlayer.receivedBye = true;
          addPoints(byePlayerUsername);
          io.to(byePlayer.id).emit(SocketEvent.RECEIVED_BYE);
        }
      }
    }

    if (
      typeof pairing.player1 === "string" &&
      typeof pairing.player2 === "string" &&
      tournament
    ) {
      const gameId = v4();
      activeGames.set(gameId, {
        fen: INITIAL_FEN,
        playersUsernames: [pairing.player1, pairing.player2],
        clocks: [tournament.time * 60, tournament.time * 60],
        isWhiteMove: true,
        spectators: [],
        history: [],
      });

      const player0 = findPlayerByUsername(pairing.player1, activePlayers);
      const player1 = findPlayerByUsername(pairing.player2, activePlayers);

      if (player0 && player1) {
        const socket0 = io.sockets.sockets.get(player0?.id);
        const socket1 = io.sockets.sockets.get(player1?.id);

        socket0?.join(gameId);
        socket1?.join(gameId);

        io.to(player0?.id).to(player1?.id).emit(SocketEvent.SET_GAME, gameId);

        updatePlayerStatus(player0, PlayerStatus.IN_GAME);
        updatePlayerStatus(player1, PlayerStatus.IN_GAME);

        startCountdown(gameId, activeGames);

        const tournamentId = findTournamentByUsername(player0.username)?.id;
        if (tournamentId) {
          io.to(tournamentId).emit(
            SocketEvent.USERS_LIST_UPDATE,
            getPlayersFromTournamentById(tournamentId)
          );
          io.to(gameId!).emit(SocketEvent.PLAYER_JOIN, [
            pairing.player1,
            pairing.player2,
          ]);
        }
      }
    }
  });

  updateAdminManager();

  const newTournamentData = findTournamentByTournamentId(tournamentId);

  io.to(tournamentId).emit(
    SocketEvent.UPDATE_ONE_TOURNAMENT,
    newTournamentData
  );
};
