import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import { authenticateToken } from '../services/authMiddleware.js';
import { Client, Environment } from 'square';
import bodyParser from 'body-parser';

const router = express.Router();
const mongoDb = await connectToDatabase();
router.use(authenticateToken);
router.use(bodyParser.json());

const squareClient = new Client({
  environment: Environment.Sandbox, // Change to Environment.Production in production
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});
const paymentsApi = squareClient.paymentsApi;

router.post('/', async (req, res) => {
  const { sourceId } = req.body;

  try {
    const paymentResponse = await paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: new Date().getTime().toString(), // Unique key for each payment
      amountMoney: {
        amount: 1000, // The amount of money, in cents (e.g., $10.00 = 1000 cents)
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID
    });

    res.json({ message: 'Payment successful!', payment: paymentResponse.result });
  } catch (error) {
    res.status(500).json({ message: 'Payment failed', error: error.message });
  }
});

export default router;
