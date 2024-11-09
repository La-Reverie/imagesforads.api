import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const mongoDb = await connectToDatabase();
const NEW_USER_CREDITS = 50;

router.post('/', async (req, res) => {
  try {
      const { credential } = req?.body;
      const decodedGoogleObj = jwt.decode(credential);

      if (decodedGoogleObj && decodedGoogleObj.email_verified) {
          const { name, picture, email } = decodedGoogleObj;
          const timeStampNow = Date.now();

          // Check if user exists in the database
          const existingUser = await mongoDb.collection('users').findOne({email: email});
          let currentUser;

          // if the user exists, update the lastModifiedAt field
          if (!!existingUser) {
              currentUser = {
                ...existingUser,
                lastModifiedAt: timeStampNow,
              };
              // update the lastModifiedAt field in the database
              const user = await mongoDb.collection('users').updateOne({email: email}, {$set: {lastModifiedAt: timeStampNow}});
              console.log("User updated: ", user);
          }
          // if the user does not exist, create a new user
          else {
              // currentUser object to be saved to the DB
              currentUser = {
                name,
                picture,
                email,
                createdAt: timeStampNow,
                lastModifiedAt: timeStampNow,
                creditBalance: NEW_USER_CREDITS,
              };
              const user = await mongoDb.collection("users").insertOne(currentUser);
              // add the newly created user's _id to the currentUser object
              currentUser._id = user.insertedId;
              console.log("User created: ", user);
          }

          const token = jwt.sign(
            { exp: Math.floor(Date.now() / 1000) + (60 * 60), }, // token good for 1 hour
            'authenticated',
          );

          res.json({
            token,
            currentUser,
            authenticated: true,
            imageUrl: picture
          });
      }
      else {
          res.send({authenticated: false, errorText: "Invalid Credentials"})
      }
  }
  catch (error) {
    console.log("ERROR: ", error)
  }
});

export default router;
