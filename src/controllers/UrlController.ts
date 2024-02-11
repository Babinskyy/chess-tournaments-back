import { Request, Response } from "express";
import { v4 } from "uuid";

export const UrlController = {
  generate: async (_req: Request, res: Response) => {
    try {
      const Uuid = v4();
      res.json(Uuid);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error ziom" });
    }
  },
};
