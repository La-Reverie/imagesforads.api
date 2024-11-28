import connectToDatabase from './MongoConnect.js';
import { fundTransaction } from '../services/transactionManager.js';

export async function getCreditsFromCode(code) {
  const mongoDb = await connectToDatabase();

  try {
    const coupon = await mongoDb.collection('couponCodes').findOne({ code });

    if (!coupon) {
      return { credits: null, error: 'Invalid coupon code' };
    }

    if (coupon.isRedeemed && !coupon.noRedemptionLimit) {
      return { creditValue: null, error: 'Coupon code has already been redeemed' };
    }

    return { creditValue: coupon.creditValue, error: null };
  } catch (error) {
    console.error('Error retrieving coupon code:', error);
    return { credits: null, error: 'Error retrieving coupon code' };
  }
}

export async function redeemCode(couponCode, accountId, userId, creditValue) {
  try {
    const db = await connectToDatabase();

    // Fund the account with the credits
    const fundedAccount = await fundTransaction(
      accountId,
      userId,
      creditValue,
      0, // amount is 0 since this is a code redemption
      'codeRedemption',
      couponCode, // using code as the reference instead of squarePaymentId
      null, // no recurrence for code redemptions
      false, // not unlimited
      false, // should not renew
      null // no expiry date
    );

    const result = await db.collection('couponCodes').updateOne(
      { code: couponCode },
      { $set: { isRedeemed: true, redeemedAt: new Date() } }
    );

    return { success: true, newCreditBalance: fundedAccount.creditBalance };
  } catch (error) {
    console.error('Error redeeming code:', error);
    throw error;
  }
}
