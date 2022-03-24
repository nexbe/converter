import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
import { claimSale } from './routes/claim-sale';
import { NotFoundError } from './errors/not-found-error';
import { errorHandler } from './middlewares/error-handler';

const app = express();
app.set('trust proxy', true);
app.use(json());

app.use(claimSale);

app.all('*', async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
