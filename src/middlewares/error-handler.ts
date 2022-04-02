import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../errors/custom-error';
import Logger from "../lib/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomError) {
    Logger.error({ message: err.message})
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  Logger.error({ message: err.message})
  res.status(400).send({
    errors: [{ message: `Something went wrong! ${err.message}`}],
  });
};
