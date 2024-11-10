import axios from 'axios';
import connectToDatabase from './MongoConnect.js';
import { createAccount } from './accountManager.js';

const mongoDb = await connectToDatabase();

async function getUserByEmail(name, picture, email) {
  const timeStampNow = Date.now();
  try {
    // Check if user exists in the database
    const existingUser = await mongoDb.collection('users').findOne({email: email});
    let currentUser;

    // if the user exists, update the lastModifiedAt field in the database
    if (!!existingUser) {
        currentUser = {
          ...existingUser,
          lastModifiedAt: timeStampNow,
        };
        const response = await mongoDb.collection('users').updateOne({email: email}, {$set: {lastModifiedAt: timeStampNow}});
        console.log("User updated: ", response);
    }
    // if the user does not exist, create a new user
    else {
      currentUser = await createUser(name, picture, email);
    }
    return currentUser;

  } catch (error) {
    console.error('Error getting user:', error.message);
    // TODO: handle error
  }
}

async function createUser(name, picture, email) {
  try {
    const timeStampNow = Date.now();
    const currentUser = {
      name,
      picture,
      email,
      createdAt: timeStampNow,
      lastModifiedAt: timeStampNow,
    };
    const response = await mongoDb.collection("users").insertOne(currentUser);
    // add the newly created user's _id to the currentUser object
    currentUser._id = response.insertedId;
    console.log("User created: ", response);
    return currentUser;
  } catch(error) {
    console.error('Error creating user:', error.message);
    // TODO: handle error
  }
}

export { getUserByEmail };
