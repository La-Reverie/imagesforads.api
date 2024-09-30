import express from 'express';
import 'dotenv/config'
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRouter from './routes/generate.js';
import authenticateRouter from './routes/authenticate.js';
import connectToDatabase from './services/MongoConnect.js';

dotenv.config();

const app = express();
const mongoDb = await connectToDatabase();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors());
app.use(bodyParser.json());

app.use('/api/authenticate', authenticateRouter);
app.use('/api/generate', generateRouter);

// Creating the /test route
app.get('/test', (req, res) => {
  console.log('TEST ROUTE SUCCESSFUL');
  res.send('API IS WORKING');
});

export default app;
