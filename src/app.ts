import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
const ejs = require("ejs");
import { json } from 'body-parser';

// Routes Imports
import { claimSale } from './routes/claim-sale';
import { eIncentive } from "./routes/e-incentive";


// Error Handlers and Middleware Imports
import { NotFoundError } from './errors/not-found-error';
import { errorHandler } from './middlewares/error-handler';
import { eDisplay } from "./routes/e-display";
import { timesetting } from "./routes/timesetting";
import { ePaymentVoucher } from "./routes/e-paymentVoucher";
import { inventory } from "./routes/e-Inventory";
import morganMiddleware from "./middlewares/morgan";

// Express app Initialization
export const app = express();

app.set('trust proxy', true);
app.use(json());
app.use(morganMiddleware);
app.use(claimSale);
app.use(eIncentive);
app.use(eDisplay);
app.use(timesetting)
app.use(ePaymentVoucher)
app.use(inventory)

app.all('*', async (req, res) => {
  throw new NotFoundError();
});


app.use(errorHandler);
