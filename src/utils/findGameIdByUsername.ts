import { Game } from "../types/types";

export const findGameIdByUsername = (
  username: string,
  activeGames: Map<string, Game>
): string | undefined => {
  for (const [gameId, gameData] of activeGames) {
    if (
      gameData?.playersUsernames &&
      gameData.playersUsernames.includes(username)
    ) {
      return gameId;
    }
  }

  return undefined;
};
