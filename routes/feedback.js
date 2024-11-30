import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import OpenAI from 'openai';
import bodyParser from 'body-parser';
import { authenticateToken } from '../services/authMiddleware.js';
import { ObjectId } from 'mongodb';
import { fundTransaction } from '../services/transactionManager.js';

const router = express.Router();
const mongoDb = await connectToDatabase();
router.use(authenticateToken);
router.use(bodyParser.json());

const CREDITS_PER_FEEDBACK = 50;
// POST - Create new feedback
router.post('/', async (req, res) => {
  try {
    const { userId, accountId, userFeedback } = req.body;
    if (!userId || !accountId || !userFeedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert feedback into database
    await mongoDb.collection('feedback').insertOne({
      userId: new ObjectId(userId),
      accountId: new ObjectId(accountId),
      userFeedback,
      createdAt: new Date(),
    });

    const updatedAccount = await fundTransaction(
      accountId,
      userId,
      CREDITS_PER_FEEDBACK,
      0,
      'feedbackCredit',
      null,
      0,
      null,
      null,
      false
    );
    console.log('updatedAccount:', updatedAccount);

    // TODO: Add validation
    // TODO: Add logic to save feedback to database

    res.json({
      message: 'Feedback created successfully',
      newCreditBalance: updatedAccount.creditBalance,
      creditsAdded: CREDITS_PER_FEEDBACK
    });
  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});


export default router;