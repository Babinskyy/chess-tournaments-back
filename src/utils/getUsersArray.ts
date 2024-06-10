import { Player } from '../types/types.types';

export const getUsersArray = (activePlayers: Set<Player>) =>
  Array.from(activePlayers);
