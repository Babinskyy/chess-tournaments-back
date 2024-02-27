export const findGameByUsername = (
  username: string,
  activeGames: Map<any, any>
): string | undefined => {
  for (const [game, gameData] of activeGames) {
    if (gameData?.players && gameData.players.includes(username)) {
      return game;
    }
  }

  return undefined;
};
