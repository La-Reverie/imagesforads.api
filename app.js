import express from 'express';
import 'dotenv/config'
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRouter from './routes/generate.js';
import authenticateRouter from './routes/authenticate.js';
import trackRouter from './routes/track.js';
import connectToDatabase from './services/MongoConnect.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from './services/authMiddleware.js';

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
app.use('/api/track', trackRouter);
app.post('/api/subscribe', authenticateToken, async (req, res) => {
  const user = await JSON.parse(req.body.currentUser);
  try {
    const existingUser = await mongoDb.collection('users').findOne({_id: new ObjectId(user._id)});
    if (!existingUser) {
      return res.status(404).send('User not found');
    }

    const subscribed = await mongoDb.collection('subscriptions').insertOne({
      email: existingUser.email,
      createdAt: Date.now(),
      broadcast: new ObjectId('67009bb6561716ca36c62d69'),
      owner: new ObjectId(user._id),
    });

    res.send({ success: true });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default app;
