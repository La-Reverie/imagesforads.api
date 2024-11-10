import axios from 'axios';
import connectToDatabase from './MongoConnect.js';
import { updateCreditBalance } from './accountManager.js';

const mongoDb = await connectToDatabase();

async function debitAccount() {
  try {


  } catch (error) {
    console.error('Error debiting account:', error.message);
    // TODO: handle error
  }
}

async function fundAccount(account, userId, amount, transactionType) {
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
    return await mongoDb.collection('accounts').findOne({ownerId: userId});
  } catch (error) {
    console.error('Error funding account:', error.message);
    // TODO: handle error
  }
}

export { debitAccount, fundAccount };
