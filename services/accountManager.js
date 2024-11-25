import axios from 'axios';
import connectToDatabase from './MongoConnect.js';
import { fundTransaction } from './transactionManager.js';
import { ObjectId } from 'mongodb';
const NEW_USER_CREDITS = 51;
const mongoDb = await connectToDatabase();

async function getAccountByUserId(userId) {
  const timeStampNow = Date.now();
  try {
    // Check if user exists in the database
    const existingAccount = await mongoDb.collection('accounts').findOne({ownerId: userId});
    let account;
    // if the account exists, update the lastModifiedAt field in the database
    if (!!existingAccount) {
        account = {
          ...existingAccount,
          lastModifiedAt: timeStampNow,
        };
        const response = await mongoDb.collection('accounts').updateOne({ownerId: userId}, {$set: {lastModifiedAt: timeStampNow}});
        console.log("Account updated: ", response);
    }
    // if the user does not exist, create a new user and a new account
    else {
      account = await createAccount(userId);
      const transactionType = 'accountCreate';
      account = fundTransaction(
        account._id,
        userId,
        NEW_USER_CREDITS,
        0,
        transactionType,
        0,
        0,
        null,
        false,
      );
    }
    return account;
  } catch (error) {
    console.error('Error getting account:', error.message);
  }
}

async function createAccount(userId) {
  try {
    const timeStampNow = Date.now();
    const account = {
      ownerId: userId,
      members: [],
      displayName: 'Default Account',
      status: 'active', // inactive, suspended, pending
      accountType: 'standard', // or premium
      notes: '',
      creditBalance: 0,
      createdAt: timeStampNow,
      lastModifiedAt: timeStampNow,
    };

    const response = await mongoDb.collection("accounts").insertOne(account);
    // add the newly created account _id to the account object
    account._id = response.insertedId;
    console.log("Account created: ", account);
    return account;

  } catch (error) {
    console.error('Error creating account:', error.message);
    // TODO: handle error
  }
}

async function updateCreditBalance(accountId, currentCreditBalance, amountToAdd) {
  const timeStampNow = Date.now();
  try {
    const isVerified = verifyCreditBalance(accountId, currentCreditBalance);
    if (isVerified) {
      const newBalance = currentCreditBalance + amountToAdd;
      const response = await mongoDb.collection('accounts').updateOne({_id: new ObjectId(accountId)}, {$set: {lastModifiedAt: timeStampNow, creditBalance: newBalance}});
      return currentCreditBalance + amountToAdd;
    }
  } catch(error) {
    // TODO: handle error
    console.log(error);
  }
}

async function verifyCreditBalance(accountId, currentCreditBalance) {
  return getCreditBalance(accountId) === currentCreditBalance;
}

async function getCreditBalance(accountId) {
  const account = await mongoDb.collection('accounts').findOne({_id: new ObjectId(accountId)});
  return account.creditBalance;
}

export { createAccount, getAccountByUserId, updateCreditBalance, getCreditBalance};
