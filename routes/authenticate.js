import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import { getUserByEmail } from '../services/userManager.js';
import { getAccountByUserId } from '../services/accountManager.js';
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
        const currentUser = await getUserByEmail(name, picture, email);
        const account = await getAccountByUserId(currentUser._id);
        const token = jwt.sign(
          { exp: Math.floor(Date.now() / 1000) + (60 * 60), }, // token good for 1 hour
          'authenticated',
        );

        res.json({
          token,
          currentUser,
          account,
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
