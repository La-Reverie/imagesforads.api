import express from 'express';
import connectToDatabase from '../services/MongoConnect.js';
import OpenAI from 'openai';
import { authenticateToken } from '../services/authMiddleware.js';
import { generateImage, generateImageConcept } from '../services/generativeAi.js';
import { uploadToCDN } from '../services/fileStore.js';
import multer from 'multer'; 
import FormData from 'form-data'; 
import axios from 'axios'; 


import { getCreditBalance } from '../services/accountManager.js';
import { debitTransaction } from '../services/transactionManager.js';


const router = express.Router();
const OPEN_API_KEY = process.env.OPEN_API_KEY;

const mongoDb = await connectToDatabase();

const CREDITS_TO_GENERATE_IMAGE = 5;

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
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

// Initialize Multer Singleton
// TODO: implement Multer for existing file uploads https://github.com/La-Reverie/imagesforads/issues/68
const upload = multer();

// Ruta principal existente
router.use(authenticateToken);

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


/**
 * POST /inpaint
 * This one sends the images to OPENAI Dall-E-2
 */
router.post('/inpaint', upload.fields([{ name: 'image' }, { name: 'mask' }]), async (req, res) => {
  console.log('Inpainting request received');

  try {
    const { prompt, n } = req.body;

    // Validación básica
    // we check if we have the image and the mask
    if (!req.files || !req.files['image'] || !req.files['mask']) {
      console.error('Missing files:', req.files);
      return res.status(400).json({ error: 'Image and mask files are required.' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // Obtener los buffers de las imágenes
    const imageBuffer = req.files['image'][0].buffer;
    const maskBuffer = req.files['mask'][0].buffer;

    // Función para obtener las dimensiones de una imagen PNG
    function getImageDimensions(buffer) {
      // Leemos el ancho y alto desde el chunk IHDR del PNG
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // Obtener dimensiones de la imagen
    const imageDimensions = getImageDimensions(imageBuffer);

    // This is from OPENAI, these are the image sizes they allow
    const allowedSizes = ['256x256', '512x512', '1024x1024'];
    const sizeFromImage = `${imageDimensions.width}x${imageDimensions.height}`;

    if (!allowedSizes.includes(sizeFromImage)) {
      return res.status(400).json({
        error: `Invalid image size ${sizeFromImage}. Allowed sizes are ${allowedSizes.join(', ')}.`,
      });
    }



    // We create the FormData instance
    const formData = new FormData();

    // Then we add the images to the buffer
    formData.append('image', imageBuffer, 'image.png');
    formData.append('mask', maskBuffer, 'mask.png');

    // We add the prompt and the other data from OPENAI
    formData.append('prompt', prompt);
    formData.append('n', n || '1');
    formData.append('size', size || sizeFromImage);

    // We send the request and await for the response
    const openaiResponse = await axios.post('https://api.openai.com/v1/images/edits', formData, {
      headers: {
        'Authorization': `Bearer ${OPEN_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    const responseData = openaiResponse.data;

    console.log('OpenAI response:', responseData);

    // We get the image back and store it here
    const generatedImages = responseData.data; 
    if (generatedImages && generatedImages.length > 0) {
      const imageUrl = generatedImages[0].url;
      res.json({ images: [{ url: imageUrl }] });
    } else {
      res.status(500).json({ error: 'No images returned from OpenAI API.' });
    }
  } catch (error) {
    console.error('Error processing inpainting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;