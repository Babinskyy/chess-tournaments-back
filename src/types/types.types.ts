export type User = {
    id: string;
    username: string;
    points: number;
    status: 'notStarted' | 'inGame' | 'waiting';
  };