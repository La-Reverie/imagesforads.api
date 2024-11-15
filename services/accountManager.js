import axios from 'axios';
import connectToDatabase from './MongoConnect.js';
import { fundTransaction } from './transactionManager.js';
import { ObjectId } from 'mongodb';

const mongoDb = await connectToDatabase();

async function getOrCreateAccountByUserId(userId) {
  // return existing account
  const existingAccount = await getAccountByUserId(userId);

  if (!!existingAccount) {
    return existingAccount;
  }
  // if no existing account, create one
  const newAccount = await createAccount(userId);
  // then fund the new account and return it
  const amount = 100;
  const transactionType = 'accountCreate';
  const account = await fundTransaction(newAccount, userId, amount, transactionType);
  return account;
}

async function getAccountByUserId(userId) {
  try {
    // Check if user exists in the database
    const timeStampNow = Date.now();
    const existingAccount = await mongoDb.collection('accounts').findOne({ownerId: userId});
    if (!!existingAccount) {
      const account = {
        ...existingAccount,
        lastModifiedAt: timeStampNow,
      };

      await mongoDb.collection('accounts').updateOne({ownerId: userId}, {$set: {lastModifiedAt: timeStampNow}});
      return account;
    }

    return false;
  } catch (error) {
    console.error('Error getting account:', error.message);
    // TODO  implement error
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

export { createAccount, getOrCreateAccountByUserId, updateCreditBalance, getCreditBalance};
