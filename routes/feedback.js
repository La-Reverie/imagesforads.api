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

const OPEN_API_KEY = process.env.OPEN_API_KEY;
const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

const CREDITS_PER_FEEDBACK = 50;

const generateValidationPrompt = (userFeedback) => {
  return `My web app, ImagesForAds.Ai, generates images for advertisers to use in their online image ads.
          We are currently in the beta round, and the most important aspect of this round is user feedback.
          We have a feedback form where users enter their feedback, and upon approval, we give them 50
          credits to use for generating images. Please help me validate that the feedback the user has
          entered onto this form is valid feedback. If the feedback is gibberish, obviously the answer is
          false. If the feedback is a proper sentence but not related to the product, again the answer is
          false. If the feedback appears to be an honest attempt at helping us improve our features, the
          answer is true. Below is the feedback from the user.

          Validate the feedback and respond with a valid JSON object only. Do not include any backticks,
          formatting, or additional text. For example:
          {
            "isValid": true,
            "userMessage": "Thank you for your feedback!"
          }

          The value of the userMessage field will be shown to the user. Please include feedback for the
          user describing why you chose true or false for the isValid field. Please keep the userMessage
          value short and concise. Here's the user's input: ${userFeedback}`;
};

// POST - Create new feedback
router.post('/', async (req, res) => {
  try {
    const { userId, accountId, userFeedback } = req.body;
    if (!userId || !accountId || !userFeedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const feedbackJson = await validateFeedback(userFeedback);
    const feedbackResponse = await JSON.parse(feedbackJson);

    await mongoDb.collection('feedback').insertOne({
      userId: new ObjectId(userId),
      accountId: new ObjectId(accountId),
      userFeedback,
      createdAt: new Date(),
      feedbackResponse,
    });

    if (!feedbackResponse.isValid) {
      return res.status(400).json({ error: feedbackResponse.userMessage });
    }

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

    res.json({
      message: 'Feedback created successfully',
      newCreditBalance: updatedAccount.creditBalance,
      creditsAdded: CREDITS_PER_FEEDBACK,
      feedbackResponseMessage: feedbackResponse.userMessage
    });

  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});


const validateFeedback = async (userFeedback) => {
  const textPrompt = generateValidationPrompt(userFeedback);
  console.log('validating feedback');
  const conceptResponse = await openai.chat.completions.create({
    messages: [{ role: "user", content: textPrompt }],
    model: "gpt-4o",
  });
  return conceptResponse.choices[0].message.content
}


export default router;