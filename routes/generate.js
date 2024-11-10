import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import OpenAI from 'openai';
import { generateImage, generateImageConcept } from '../services/generativeAi.js';
import { uploadToCDN } from '../services/fileStore.js';
import { getCreditBalance } from '../services/accountManager.js';
import { debitTransaction } from '../services/transactionManager.js';


const router = express.Router();
const OPEN_API_KEY = process.env.OPEN_API_KEY;
const mongoDb = await connectToDatabase();

const CREDITS_TO_GENERATE_IMAGE = 5;

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

router.post('/', async (req, res) => {
  try {
    console.log('Generate');
    const account = JSON.parse(req.body.account);
    const currentUser = JSON.parse(req.body.currentUser);
    // check credits
    const creditBalance = await getCreditBalance(account._id);
    if (creditBalance < CREDITS_TO_GENERATE_IMAGE) {
      // TODO inform frontend that credit balance is low
      const errorCode = 'LOW_CREDIT_BALANCE';
      const errorMessage = 'Your credit balance is low! Please ad credits to continue.';
      // Send a structured error response
      res.status(500).json({
        code: errorCode,
        message: errorMessage
      });
      return false;
    }
    const conceptPrompt = await generateImageConcept(req);
    const generatedImageResponse = await generateImage(conceptPrompt);
    const imageInfo = await uploadToCDN(generatedImageResponse.data[0].url, req);
    const submission = await saveSubmission(imageInfo, conceptPrompt, req);
    // debit credits
    const updatedAccount = await debitTransaction(account, currentUser._id, CREDITS_TO_GENERATE_IMAGE, 'image_generation');
    res.send({
      submissionId: submission.insertedId,
      imageUrl: imageInfo.publicUrl,
      imageId: imageInfo._id,
      account: updatedAccount,
    });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);

    // Check for known error properties
    const errorCode = error.code || 'unknown_error';
    const errorMessage = error.message || 'An error occurred while generating the concept';

    // Send a structured error response
    res.status(500).json({
      code: errorCode,
      message: errorMessage
    });
  }
});

async function saveSubmission(imageInfo, conceptPrompt, req) {
  console.log('saving submission');
  const submissionInfo = {
    userInput: req.body.userInput,
    owner: imageInfo._id,
    absoluteFilePath: imageInfo.absoluteFilePath,
    conceptPrompt,
    createdAt: Date.now(),
  };

  try {
    return await mongoDb.collection('generationRequests').insertOne(submissionInfo);
  }
  catch (err) {
    console.log('Error saving submission:', err);
  }
}

export default router;
