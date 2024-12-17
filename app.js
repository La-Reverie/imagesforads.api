import express from 'express';
import 'dotenv/config'
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRouter from './routes/generate.js';
import authenticateRouter from './routes/authenticate.js';
import trackRouter from './routes/track.js';
import paymentsRouter from './routes/payments.js';
import connectToDatabase from './services/MongoConnect.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from './services/authMiddleware.js';
import feedbackRouter from './routes/feedback.js';
import { getAccountById } from './services/accountManager.js';
import axios from 'axios';
import { getUserById } from './services/userManager.js';

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
app.use('/api/payments', paymentsRouter);
app.use('/api/feedback', feedbackRouter);

app.post('/api/subscribe', authenticateToken, async (req, res) => {
  const userId = new ObjectId(req.body.currentUserId);
  const broadcastId = req.body.broadcastId;

  try {
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return res.status(404).send('User not found');
    }
    const existingSubscription = await mongoDb.collection('subscriptions').findOne({
      owner: userId,
      broadcast: broadcastId
    });

    if (existingSubscription) {
      return res.send({ success: true, message: '🎉 You\'re already part of the club!' });
    }

    const subscribed = await mongoDb.collection('subscriptions').insertOne({
      email: existingUser.email,
      createdAt: Date.now(),
      broadcast: broadcastId,
      owner: userId,
    });

    res.send({ success: true, message: '🎉 You\'re now part of the club!' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/get-images', authenticateToken, async (req, res) => {
  try {
    const accountId = req.body.accountId;
    const images = await mongoDb.collection('images').find({ accountId: accountId }).toArray();
    res.send({ success: true, images });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/getCreditBalance', authenticateToken, async (req, res) => {
  try {
    const accountId = req.body.accountId;
    const account = await getAccountById(accountId);
    res.send({ success: true, creditBalance: account.creditBalance });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/api/proxy-image", authenticateToken, async (req, res) => {
  const { url } = req.query;
  const referrerUrl = process.env.NODE_ENV === 'DEV'
    ? 'http://localhost:3001'
    : process.env.PRODUCTION_URL ;

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "YourCustomAgent/1.0",
        Referer: referrerUrl,
      },
    });

    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Content-Disposition", `attachment; filename="ad-image.png"`);
    res.send(response.data);
  } catch (error) {
    console.error("Error fetching image from Bunny.net", error.message);
    res.status(error.response?.status || 500).send("Failed to fetch image");
  }
});


export default app;
