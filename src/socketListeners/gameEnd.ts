import { updateAdminManager } from "../functions/updateAdminManager";
import { addPoints } from "../socket/addPoints";
import { finishGame } from "../socket/finishGame";
import { activeGames, activePlayers } from "../socket/onConnection";
import {
  Color,
  GameFinishReason,
  PlayerStatus,
  TournamentType,
} from "../types/types";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";
import { findTournamentByUsername } from "../utils/findTournamentByUsername";
import { updatePlayerColor } from "../utils/updatePlayerColor";
import { updatePlayerStatus } from "../utils/updatePlayerStatus";

export const gameEnd = (
  result: Color | "draw" | undefined | "",
  reason: GameFinishReason | undefined,
  room: string
) => {
  const finishedGame = activeGames.get(room);

  if (finishedGame) {
    const tournamentType = findTournamentByUsername(
      finishedGame?.playersUsernames[0]
    )?.type;

    const winner =
      result === "white"
        ? finishedGame.playersUsernames[0]
        : result === "black"
        ? finishedGame.playersUsernames[1]
        : result === ""
        ? tournamentType === TournamentType.SWISS
          ? finishedGame.playersUsernames[1]
          : ""
        : "draw";

    const player0 = findPlayerByUsername(
      finishedGame.playersUsernames[0],
      activePlayers
    );
    const player1 = findPlayerByUsername(
      finishedGame.playersUsernames[1],
      activePlayers
    );

    if (player0 && player1) {
      updatePlayerColor(player0, Color.WHITE);
      updatePlayerColor(player1, Color.BLACK);
      updatePlayerStatus(player0, PlayerStatus.NOT_STARTED);
      updatePlayerStatus(player1, PlayerStatus.NOT_STARTED);
    }

    addPoints(winner, room, activeGames);
    finishGame(room, result, reason);
    activeGames.delete(room);
  }
  updateAdminManager();
};
