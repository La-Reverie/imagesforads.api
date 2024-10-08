import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';

const router = express.Router();

const mongoDb = await connectToDatabase();

router.post('/', async (req, res) => {
  try {
    if (!req.body.eventKey) {
      return res.status(400).send('Event key is required');
    }

    const eventData = {
      ...req.body,
      createdAt: Date.now(),
    };
    await mongoDb.collection('tracking').insertOne(eventData);
    res.status(200).send('event tracked successfully');
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).send('Error tracking event');
  }
});

export default router;