import { app } from './app';

const start = async () => {

  // if (!process.env.MONGO_URI) {
  //   throw new Error('MONGO_URI must be defined');
  // }
  // if (!process.env.NATS_CLIENT_ID) {
  //   throw new Error('NATS_CLIENT_ID must be defined');
  // }
  // if (!process.env.NATS_URL) {
  //   throw new Error('NATS_URL must be defined');
  // }
  // if (!process.env.NATS_CLUSTER_ID) {
  //   throw new Error('NATS_CLUSTER_ID must be defined');
  // }

  app.listen(3000, () => {
    console.log('Listening on port 3000!!!!!!!!');
  });
};

start();