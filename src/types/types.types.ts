export enum PlayerStatus {
  NOT_STARTED = 'notStarted',
  IN_GAME = 'inGame',
  WAITING = 'waiting',
}

export type User = {
  id: string;
  username: string;
  points: number;
  status: PlayerStatus;
  isAdmin: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  playersUsernames: string[]
};
