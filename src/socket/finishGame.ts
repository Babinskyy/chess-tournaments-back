import { io } from "../..";
import { activeGames, allPlayers } from "./onConnection";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import {
  PlayerStatus,
  SocketEvent,
  Player,
  TournamentType,
  GameFinishReason,
} from "../types/types";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { getPlayersFromTournamentById } from "../utils/getPlayersFromTournamentById";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";
import { updateAdminManager } from "../functions/updateAdminManager";

export const finishGame = (
  game: string,
  result: string | undefined,
  reason: GameFinishReason | undefined
) => {
  let tempPlayer: Player | undefined;
  const gameDetails = activeGames.get(game);

  if (!gameDetails) {
    return;
  }

  const { playersUsernames, spectators } = gameDetails;

  if (playersUsernames.length === 2) {
    const [player1Username, player2Username] = playersUsernames;

    const player1 = findPlayerByUsername(player1Username, allPlayers);
    const player2 = findPlayerByUsername(player2Username, allPlayers);
    const tournamentType = findTournamentByUsername(player1Username)?.type;

    if (result || tournamentType === TournamentType.SWISS) {
      if (player1 && player2) {
        if (!player1.playersPlayed.includes(player2.username)) {
          player1.playersPlayed.push(player2.username);
        }
        if (!player2.playersPlayed.includes(player1.username)) {
          player2.playersPlayed.push(player1.username);
        }
      }
    }
  }

  playersUsernames.forEach((playerUsername) => {
    const player = findPlayerByUsername(playerUsername, allPlayers);
    tempPlayer = player;
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
    }
  });

  spectators.forEach((spectator) => {
    const player = findPlayerByUsername(spectator, allPlayers);
    if (player && player.status !== PlayerStatus.DISCONNECTED) {
      updatePlayerStatus(player, PlayerStatus.NOT_STARTED);
    }
  });

  activeGames.delete(game);

  io.to(game).emit(SocketEvent.FINISH_GAME, { result, reason });

  if (tempPlayer) {
    const tournamentId = findTournamentByUsername(tempPlayer.username)?.id;
    if (tournamentId) {
      io.to(tournamentId).emit(
        SocketEvent.USERS_LIST_UPDATE,
        getPlayersFromTournamentById(tournamentId)
      );
    }
  }

  updateAdminManager();
};
