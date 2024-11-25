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
    throw new Error(`Failed to debit account: ${error.message}`);
  }
}

async function fundTransaction(
  accountId,
  userId,
  creditCount,
  amount,
  transactionType,
  paymentId,
  recurrence,
  shouldRenew,
  planExpiryDate,
  isUnlimited,
) {
  try {
    const timeStampNow = Date.now();
    const updatedAccount = await mongoDb.collection('accounts').findOne({_id: new ObjectId(accountId)});
    const numericCreditCount = Number(creditCount);
    const balanceAfterTransaction = updatedAccount.creditBalance + numericCreditCount;
    const transaction = {
      accountId: updatedAccount._id,
      userId,
      creditCount: numericCreditCount,
      balanceAfterTransaction,
      amountPaid: Number(amount),
      transactionType,
      createdAt: timeStampNow,
      lastModifiedAt: timeStampNow,
      notes: 'API transaction',
      paymentId: paymentId || 0,
      paymentSource: paymentId ? 'square' : 'coupon',
      recurrence: Number(recurrence),
      shouldRenew: Boolean(shouldRenew),
      planExpiryDate: planExpiryDate ? new Date(planExpiryDate) : null,
      isUnlimited: Boolean(isUnlimited),
    };
    await mongoDb.collection('transactions').insertOne(transaction);
    await updateCreditBalance(updatedAccount._id, updatedAccount.creditBalance, numericCreditCount);
    return await mongoDb.collection('accounts').findOne({_id: updatedAccount._id});
  } catch (error) {
    throw new Error(`Failed to fund account: ${error.message}`);
  }
}

export { debitTransaction, fundTransaction };
