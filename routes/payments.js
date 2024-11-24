import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import { authenticateToken } from '../services/authMiddleware.js';
import { Client, Environment } from 'square';
import bodyParser from 'body-parser';
import { getOrCreateSquareCustomer } from '../services/square.js';
import crypto from 'crypto';
import { fundTransaction } from '../services/transactionManager.js';

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
  const {
    sourceId,
    creditCount,
    accountId,
    userId,
    recurrence,
    amount,
    isUnlimited,
    squarePaymentId,
    shouldRenew,
    planExpiryDate,
  } = req.body;

  try {
    const paymentResponse = await paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: crypto.randomBytes(16).toString('hex'),
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
    });

    const squarePaymentId = paymentResponse.result.payment.id;
    const fundedAccount = await fundTransaction(
      accountId,
      userId,
      creditCount,
      amount,
      'creditPurchase',
      squarePaymentId,
      recurrence,
      isUnlimited,
      shouldRenew,
      planExpiryDate,
    );

    res.json({ status: paymentResponse.result.payment.status, squarePaymentId, newCreditBalance: fundedAccount.creditBalance, isUnlimited });
  } catch (error) {
    console.error('Payment error details:', error);
    res.status(500).json({ message: 'Payment failed', error: error.message });
  }
});

/* Saves a payment type and creates a new "customer" in Square CRM */
router.post('/save', async (req, res) => {
  try {
    const squareCustomer = await getOrCreateSquareCustomer(req.body, squareClient);

    const paymentData = {
      payment: {
        Token: req.body.token,
        details: req.body.details,
        type: 'card',
      },
      accountId: req.body.accountId,
      userId: req.body.userId,
      squareCustomerId: squareCustomer.id,
      address: squareCustomer.address,
    };

    const newPayment = await mongoDb.collection('payments').insertOne(paymentData);

    // Send a success response back to the frontend
    res.status(200).json({ message: 'Payment processed successfully.', payment: newPayment });
  } catch (error) {
    console.error('Error saving payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
