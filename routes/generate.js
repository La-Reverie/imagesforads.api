import express from 'express';
import bodyParser from 'body-parser';
import connectToDatabase from '../services/MongoConnect.js';
import OpenAI from 'openai';
import { authenticateToken } from '../services/authMiddleware.js';
import { generateImage, generateImageConcept } from '../services/generativeAi.js';
import { uploadToCDN } from '../services/fileStore.js';
import multer from 'multer'; 
import FormData from 'form-data'; 
import axios from 'axios'; 
import { combinePrompts } from '../services/generativeAi.js';
import { getCreditBalance } from '../services/accountManager.js';
import { debitTransaction } from '../services/transactionManager.js';
import { getAccountById } from '../services/accountManager.js';

const router = express.Router();
const OPEN_API_KEY = process.env.OPENAI_API_KEY;
const mongoDb = await connectToDatabase();

const CREDITS_TO_GENERATE_IMAGE = 5;
const CREDITS_TO_INPAINT_IMAGE = 3;

// Increase payload size limits
router.use(bodyParser.json({limit: '50mb'}));
router.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true
}));

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});


async function saveSubmission(imageInfo, conceptPrompt, req) {
  console.log('saving submission');
  const submissionInfo = {
    userInput: req.body.userInput,
    owner: imageInfo.userId,
    originalUrl: imageInfo.originalUrl,
    publicUrl: imageInfo.publicUrl,
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

// Initialize Multer Singleton
// TODO: implement Multer for existing file uploads https://github.com/La-Reverie/imagesforads/issues/68
const upload = multer();

// Ruta principal existente
router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    console.log('Generate');
    const { accountId, currentUserId } = req.body;
    // check credits
    const creditBalance = await getCreditBalance(accountId);
    if (creditBalance < CREDITS_TO_GENERATE_IMAGE) {
      // TODO inform frontend that credit balance is low
      const errorCode = 'LOW_CREDIT_BALANCE';
      const errorMessage = 'Your credit balance is low! Please add credits to continue.';
      // Send a structured error response
      res.status(500).json({
        isError: true,
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
    const updatedAccount = await debitTransaction(accountId, currentUserId, CREDITS_TO_GENERATE_IMAGE, 'image_generation');
    res.send({
      submissionId: submission.insertedId,
      imageUrl: imageInfo.publicUrl,
      imageId: imageInfo.imageId,
      account: updatedAccount,
      originalConceptPrompt: conceptPrompt,
      newCreditBalance: updatedAccount.creditBalance,
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

/**
 * POST /inpaint
 * This one sends the images to OPENAI Dall-E-2
 */
router.post('/inpaint', upload.fields([{ name: 'image' }, { name: 'mask' }]), async (req, res) => {
  console.log('Inpainting request received');
  const { accountId, currentUserId } = req.body;
  const account = await getAccountById(accountId);

  try {
    const { prompt, n, originalConceptPrompt } = req.body;
    // check credits
    const creditBalance = await getCreditBalance(account._id);
    if (creditBalance < CREDITS_TO_INPAINT_IMAGE) {
      // TODO inform frontend that credit balance is low
      const errorCode = 'LOW_CREDIT_BALANCE';
      const errorMessage = 'Your credit balance is low! Please add credits to continue.';
      // Send a structured error response
      res.status(500).json({
        isError: true,
        code: errorCode,
        message: errorMessage
      });
      return false;
    }
    let sizeFromImage;
    
    // Combine the prompts
    const combinedPrompt = await combinePrompts(prompt, originalConceptPrompt);
    console.log('Combined prompt result:', combinedPrompt);
    
    // Add more detailed logging
    console.log('Processing image buffers...');
    const imageBuffer = req.files['image'][0].buffer;
    const maskBuffer = req.files['mask'][0].buffer;
    console.log('Image buffers processed successfully');

    // Add try-catch around dimension checking
    try {
      console.log('Checking image dimensions...');
      const imageDimensions = getImageDimensions(imageBuffer);
      console.log('Image dimensions:', imageDimensions);

      function getImageDimensions(buffer) {
        // Leemos el ancho y alto desde el chunk IHDR del PNG
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }

      const allowedSizes = ['256x256', '512x512', '1024x1024'];
      sizeFromImage = `${imageDimensions.width}x${imageDimensions.height}`;

      if (!allowedSizes.includes(sizeFromImage)) {
        return res.status(400).json({
          error: `Invalid image size ${sizeFromImage}. Allowed sizes are ${allowedSizes.join(', ')}.`,
        });
      }
    } catch (dimError) {
      console.error('Error processing image dimensions:', dimError);
      return res.status(400).json({ error: 'Invalid image format or corrupted file' });
    }

    // Now sizeFromImage is accessible here
    console.log('Preparing OpenAI API call...');
    // const openAiResponse = await openai.images.edit({
    //   image: imageBuffer,
    //   mask: maskBuffer,
    //   prompt: combinedPrompt,
    //   n: parseInt(n) || 1, // Ensure n is a number
    //   size: sizeFromImage,
    // });
        // We create the FormData instance
        const formData = new FormData();

    // Then we add the images to the buffer
    formData.append('image', imageBuffer, 'image.png');
    formData.append('mask', maskBuffer, 'mask.png');

    // We add the prompt and the other data from OPENAI
    formData.append('prompt', prompt);
    formData.append('n', n || '1');
    formData.append('size', sizeFromImage);

        // We send the request and await for the response
    const openAiResponse = await axios.post('https://api.openai.com/v1/images/edits', formData, {
      headers: {
        'Authorization': `Bearer ${OPEN_API_KEY}`,
        ...formData.getHeaders(),
      },
    });
    console.log('OpenAI API call completed');

    const responseData = openAiResponse.data;

    console.log('OpenAI response:', responseData);

    // We get the image back and store it here
    const generatedImages = responseData.data; 
    console.log('Generated images:', generatedImages); // Agrega este log

    if (generatedImages && generatedImages.length > 0) {

      const imageUrl = generatedImages[0].url;
      console.log('Attempting to upload to BunnyCDN with URL:', imageUrl);

      try {
        const imageInfo = await uploadToCDN(imageUrl, req);
        if (!imageInfo) {
          throw new Error('Upload to BunnyCDN failed, no imageInfo returned');
        }

        console.log('Image uploaded successfully to BunnyCDN:', imageInfo);
        // const currentUser = await JSON.parse(req.body.currentUser);
        const updatedAccount = await debitTransaction(accountId, currentUserId, CREDITS_TO_INPAINT_IMAGE, 'image_inpaint');
        res.json({
          images: [{ url: imageInfo.publicUrl }],
          newCreditBalance: updatedAccount.creditBalance,
        });
        // res.json({ images: [{ url: imageInfo.publicUrl }] });
      } catch (uploadError) {
        console.error('Error uploading image to BunnyCDN:', uploadError.message);
        res.status(500).json({ error: 'Failed to upload image to BunnyCDN.' });
      }
    } else {
      res.status(500).json({ error: 'No images returned from OpenAI API.' });
    }
  } catch (error) {
    console.error('Error processing inpainting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;