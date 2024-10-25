import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import OpenAI from 'openai';
import { generateImage, generateImageConcept } from '../services/generativeAi.js';
import { uploadToCDN } from '../services/fileStore.js';

const router = express.Router();
const OPEN_API_KEY = process.env.OPEN_API_KEY;

const mongoDb = await connectToDatabase();

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

router.post('/', async (req, res) => {
  console.log('Generate');
  try {
    const conceptPrompt = await generateImageConcept(req);
    const generatedImageResponse = await generateImage(conceptPrompt);
    const imageInfo = await uploadToCDN(generatedImageResponse.data[0].url, req);
    const submission = await saveSubmission(imageInfo, conceptPrompt, req);

    res.send({
      submissionId: submission.insertedId,
      imageUrl: imageInfo.publicUrl,
      imageId: imageInfo._id,
    });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).send("Error generating concept");
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
