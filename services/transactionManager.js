import connectToDatabase from './MongoConnect.js';
import { updateCreditBalance } from './accountManager.js';
import { ObjectId } from 'mongodb';

const mongoDb = await connectToDatabase();

async function debitTransaction(account, userId, positiveAmount, transactionType) {
  const amount = positiveAmount * -1;
  try {
    const timeStampNow = Date.now();
    const balanceAfterTransaction = account.creditBalance + amount;
    const transaction = {
      accountId: account._id,
      userId,
      amount,
      balanceAfterTransaction,
      transactionType, // Enum credit_purchase, image_generation, coupon_code, adjustment, accountCreate
      creadtedAt: timeStampNow,
      lastModifiedAt: timeStampNow,
      notes: 'Initial funding on account create',
      paymentId: 0,
    };
    await mongoDb.collection('transactions').insertOne(transaction);
    const newBalance = await updateCreditBalance(account._id, account.creditBalance, amount);
    account.creditBalance = newBalance;
    return account;
  } catch (error) {
    console.error('Error debiting account:', error.message);
    // TODO: handle error
  }
}

async function fundTransaction(accountId, userId, creditCount, amount, transactionType, paymentId, recurrence) {
  try {
    const timeStampNow = Date.now();
    const account = await mongoDb.collection('accounts').findOne({_id: new ObjectId(accountId)});
    const balanceAfterTransaction = account.creditBalance + creditCount;
    const paymentSource = paymentId ? 'square' : 'coupon';
    const transaction = {
      accountId: account._id,
      userId,
      creditCount,
      balanceAfterTransaction,
      amountPaid: amount,
      transactionType, // Enum credit_purchase, image_generation, coupon_code, adjustment, accountCreate
      creadtedAt: timeStampNow,
      lastModifiedAt: timeStampNow,
      notes: 'API transaction',
      paymentId: paymentId || 0, // Square Payment ID
      paymentSource: paymentSource, // Square
      recurrence, // 0, 1, 3
    };
    await mongoDb.collection('transactions').insertOne(transaction);
    await updateCreditBalance(account._id, account.creditBalance, creditCount);
    return await mongoDb.collection('accounts').findOne({_id: account._id});
  } catch (error) {
    console.error('Error funding account:', error.message);
    // TODO: handle error
  }
}

export { debitTransaction, fundTransaction };
