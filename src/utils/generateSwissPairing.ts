import { v4 } from "uuid";
import { Player } from "../types/types.types";

export const generateSwissPairings = () => {
  const playersArr = [
    {
      id: "username1", 
      score: 0, 
      pairedUpDown: false, 
      receivedBye: false, 
      avoid: [], 
      colors: [], 
    },
    {
      id: "username2",
      score: 0, 
      pairedUpDown: false, 
      receivedBye: false,
      avoid: [], 
      colors: [], 
    },
    {
      id: "username3",
      score: 0,
      pairedUpDown: false, 
      receivedBye: false, 
      avoid: [],
      colors: [],
    },
    {
      id: "username4", 
      score: 0, 
      pairedUpDown: false, 
      receivedBye: false, 
      avoid: [], 
      colors: [], 
    },
  ];

  // const pairings = Swiss(playersArr, 1, false, true);

  // console.log(pairings);
};
