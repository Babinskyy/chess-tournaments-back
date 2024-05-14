export const findGameByUsername = (
  username: string,
  activeGames: Map<any, any>
): string | undefined => {
  for (const [gameId, gameData] of activeGames) {
    if (gameData?.playersUsernames && gameData.playersUsernames.includes(username)) {
      return gameId;
    }
  }

  return undefined;
};
