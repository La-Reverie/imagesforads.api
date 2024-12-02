import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import { authenticateToken } from '../services/authMiddleware.js';
import { Client, Environment } from 'square';
import bodyParser from 'body-parser';
import { getOrCreateSquareCustomer } from '../services/square.js';
import crypto from 'crypto';
import { fundTransaction } from '../services/transactionManager.js';
import { ObjectId } from 'mongodb';
import { getCreditsFromCode, redeemCode } from '../services/redeem.js';

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

/* Redeems a code for credits */
router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { couponCode, userId, accountId } = req.body;

    // Validate required fields
    if (!couponCode || !userId || !accountId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user exists and owns the account
    const user = await mongoDb.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const account = await mongoDb.collection('accounts').findOne({ 
      _id: new ObjectId(accountId),
      ownerId: new ObjectId(userId)
    });
    if (!account) {
      return res.status(404).json({ error: 'Account not found or user is not an owner' });
    }

    // Get credits from code
    const { creditValue, error } = await getCreditsFromCode(couponCode);
    if (error) {
      return res.status(400).json({ error: error });
    }

    // Mark the code as redeemed
    const { success, newCreditBalance } = await redeemCode(couponCode, accountId, userId, creditValue);

    if (!success) {
      return res.status(400).json({ error: 'Code redemption failed' });
    }

    res.json({
      message: 'Code redeemed successfully',
      newCreditBalance,
      codeCreditValue: creditValue,
    });

  } catch (error) {
    console.error('Code redemption error:', error);
    res.status(500).json({ error: 'Code redemption failed' });
  }
});

export default router;
