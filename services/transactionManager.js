import connectToDatabase from './MongoConnect.js';
import { updateCreditBalance } from './accountManager.js';

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

async function fundTransaction(account, userId, amount, transactionType) {
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
    await updateCreditBalance(account._id, account.creditBalance, amount);
    return await mongoDb.collection('accounts').findOne({_id: account._id});
  } catch (error) {
    console.error('Error funding account:', error.message);
    // TODO: handle error
  }
}

export { debitTransaction, fundTransaction };
