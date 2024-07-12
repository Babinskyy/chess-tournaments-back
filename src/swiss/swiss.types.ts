import { Color } from "../types/types";

export type Match = {
    round: number;
    match: number;
    player1: string | number | null;
    player2: string | number | null;
    win?: {
        round: number;
        match: number;
    };
    loss?: {
        round: number;
        match: number;
    };
}

export type PairingPlayer = {
    id: string | number;
    score: number;
    pairedUpDown?: boolean;
    receivedBye?: boolean;
    avoid?: Array<string | number>;
    colors: Array<Color>;
    index?: number;
}