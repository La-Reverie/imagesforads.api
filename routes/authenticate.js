import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import { getUserByEmail } from '../services/userManager.js';
import { getOrCreateAccountByUserId } from '../services/accountManager.js';
import { generateAuthToken } from '../services/authMiddleware.js';
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
      const account = await getOrCreateAccountByUserId(currentUser._id);
      const token = generateAuthToken({
        name,
        picture,
        email,
        userId: currentUser._id,
        accountId: account._id
      });

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
