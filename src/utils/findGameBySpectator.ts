import { Game } from "../types/types.types";

export const findGameBySpectator = (
  username: string,
  activeGames: Map<string, Game>
): string | undefined => {
  for (const [gameId, gameData] of activeGames) {
    if (gameData?.spectators && gameData.spectators.includes(username)) {
      return gameId;
    }
  }

  return undefined;
};
