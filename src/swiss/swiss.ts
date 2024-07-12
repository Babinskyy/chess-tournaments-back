import blossom from "edmonds-blossom-fixed";
import { Match, PairingPlayer } from "./swiss.types";
import { shuffle } from "./shuffle";
import { Color } from "../types/types";

export function Swiss(
  players: PairingPlayer[],
  round: number,
  colors: boolean = false
): Match[] {
  const matches: Match[] = [];
  let playerArray: PairingPlayer[] = Array.isArray(players)
    ? players
    : [...new Array(players)].map((_, i) => ({
        id: i + 1,
        score: 0,
        colors: [],
        index: i,
      }));

  if (colors) {
    playerArray
      .filter((p) => !p.hasOwnProperty("colors"))
      .forEach((p) => (p.colors = []));
  }

  playerArray = shuffle(playerArray);

  playerArray.forEach((p, i) => {
    p.index = i;
  });

  const scoreGroups = [...new Set(playerArray.map((p) => p.score))].sort(
    (a, b) => a - b
  );
  const scoreSums = [
    ...new Set(
      scoreGroups
        .map((s, i, a) => {
          let sums: number[] = [];
          for (let j = i; j < a.length; j++) {
            sums.push(s + a[j]);
          }
          return sums;
        })
        .flat()
    ),
  ].sort((a, b) => a - b);

  let pairs: [number, number, number][] = [];
  for (let i = 0; i < playerArray.length; i++) {
    const curr = playerArray[i];
    const next = playerArray.slice(i + 1);

    for (let j = 0; j < next.length; j++) {
      const opp = next[j];

      if (curr.avoid?.includes(opp.id)) {
        continue;
      }

      let wt =
        14 *
        Math.log10(
          scoreSums.findIndex((s) => s === curr.score + opp.score) + 1
        );
      const scoreGroupDiff = Math.abs(
        scoreGroups.findIndex((s) => s === curr.score) -
          scoreGroups.findIndex((s) => s === opp.score)
      );
      wt +=
        scoreGroupDiff < 2
          ? 3 / Math.log10(scoreGroupDiff + 2)
          : 1 / Math.log10(scoreGroupDiff + 2);

      if (
        scoreGroupDiff === 1 &&
        curr.pairedUpDown === false &&
        opp.pairedUpDown === false
      ) {
        wt += 1.2;
      }

      if (colors) {
        const colorScore = curr.colors.reduce(
          (sum, color) => (color === Color.WHITE ? sum + 1 : sum - 1),
          0
        );
        const oppScore = opp.colors.reduce(
          (sum, color) => (color === Color.WHITE ? sum + 1 : sum - 1),
          0
        );

        if (
          curr.colors.length > 1 &&
          curr.colors.slice(-2).join("") === `${Color.WHITE}${Color.WHITE}`
        ) {
          if (
            opp.colors.slice(-2).join("") === `${Color.WHITE}${Color.WHITE}`
          ) {
            continue;
          } else if (
            opp.colors.slice(-2).join("") === `${Color.BLACK}${Color.BLACK}`
          ) {
            wt += 7;
          } else {
            wt += 2 / Math.log(4 - Math.abs(oppScore));
          }
        } else if (
          curr.colors.length > 1 &&
          curr.colors.slice(-2).join("") === `${Color.BLACK}${Color.BLACK}`
        ) {
          if (
            opp.colors.slice(-2).join("") === `${Color.BLACK}${Color.BLACK}`
          ) {
            continue;
          } else if (
            opp.colors.slice(-2).join("") === `${Color.WHITE}${Color.WHITE}`
          ) {
            wt += 8;
          } else {
            wt += 2 / Math.log(4 - Math.abs(oppScore));
          }
        } else {
          wt += 5 / (4 * Math.log10(6 - Math.abs(colorScore - oppScore)));
        }
      }

      if (curr.receivedBye || opp.receivedBye) {
        wt *= 1.5;
      }
      pairs.push([curr.index!, opp.index!, wt]);
    }
  }

  const blossomPairs = blossom(pairs, true);
  let playerCopy = [...playerArray];
  let byeArray: PairingPlayer[] = [];
  let match = 1;

  do {
    const indexA = playerCopy[0].index!;
    const indexB = blossomPairs[indexA];
    if (indexB === -1) {
      byeArray.push(playerCopy.splice(0, 1)[0]);
      continue;
    }
    playerCopy.splice(0, 1);
    playerCopy.splice(
      playerCopy.findIndex((p) => p.index === indexB),
      1
    );

    let playerA = playerArray.find((p) => p.index === indexA)!;
    let playerB = playerArray.find((p) => p.index === indexB)!;

    try {
      matches.push({
        round: round,
        match: match++,
        player1: playerA.id,
        player2: playerB.id,
      });
    } catch (error) {
      console.error(error);
    }
  } while (
    playerCopy.length >
    blossomPairs.reduce(
      (sum: number, idx: number) => (idx === -1 ? sum + 1 : sum),
      0
    )
  );

  byeArray = [...byeArray, ...playerCopy];
  for (let i = 0; i < byeArray.length; i++) {
    matches.push({
      round: round,
      match: match++,
      player1: byeArray[i].id,
      player2: null,
    });
  }

  return matches;
}
