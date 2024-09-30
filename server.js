import express from 'express';
import OpenAI from 'openai';
import 'dotenv/config'
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken'
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import { readChunk } from 'read-chunk';

dotenv.config();

const SAVE_FILE_PATH = 'generated-images';
const app = express();

// Now we move to the API
const PORT = process.env.PORT || 3001;
const OPEN_API_KEY = process.env.OPEN_API_KEY;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cors());
app.use(bodyParser.json());

//Mongo
let mongoDb;
const mongoUrl = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@imagesforads.sqyde.mongodb.net/?retryWrites=true&w=majority&appName=imagesforads`;

MongoClient.connect(mongoUrl)
  .then((db) => {
    console.log('Database connected successfully!')
    mongoDb = db.db('imagesforads');
  })
  .catch((err) => {
    console.log('Error:', err)
  })

// Start the API server on port 3000
app.listen(PORT, () => {
  console.log(`                                                                                 
    ,,          
\`7MMF'               \`7MM"""Mq.                                      db          
MM                   MM   \`MM.                                                 
MM         ,6"Yb.    MM   ,M9  .gP"Ya \`7M'   \`MF'.gP"Ya \`7Mb,od8 \`7MM  .gP"Ya  
MM        8)   MM    MMmmdM9  ,M'   Yb  VA   ,V ,M'   Yb  MM' "'   MM ,M'   Yb 
MM      ,  ,pm9MM    MM  YM.  8M""""""   VA ,V  8M""""""  MM       MM 8M"""""" 
MM     ,M 8M   MM    MM   \`Mb.YM.    ,    VVV   YM.    ,  MM       MM YM.    , 
.JMMmmmmMMM \`Moo9^Yo..JMML. .JMM.\`Mbmmd'     W     \`Mbmmd'.JMML.   .JMML.\`Mbmmd'

====================================================================================
                          API Server is running on port ${PORT}                  
====================================================================================
                `);
});

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

const generateTextPrompt = (userInput) => {
  return `I am creating an online ad campaign and I need images for the ads. The subject of my ads is: ${userInput.subject}
          The URL for my subject is: ${userInput.url}
          The objective for my campaign is: ${userInput.objective}
          The copy for my ads is: ${userInput.ad_copy}
          Please create a detailed description of the image we should use for this ad. The image should be as simple as possible,
          containing just a few elements.`;
};

app.post('/api/generate', async (req, res) => {
  console.log('Generate');

  try {
    const textPrompt = generateTextPrompt(req.body.userInput);
    console.log('generating concept');
    const conceptResponse = await openai.chat.completions.create({
      messages: [{ role: "user", content: textPrompt }],
      model: "gpt-3.5-turbo",
      // model: "gpt-4-1106-preview",
    });

    const conceptPrompt = await conceptResponse.choices[0].message.content;
    console.log('generating image');
    const imageResponse = await openai.images.generate({
      prompt: conceptPrompt,
      model: 'dall-e-3',
      quality: 'hd',
      size: '1024x1024',
      style: 'vivid',
      n: 1,
    });
    
    await app.storeFileByUrl(imageResponse.data[0].url, req);
    res.send(imageResponse);
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).send("Error generating concept");
  }
});

app.post('/api/authenticate', async (req, res) => {
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
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFileName(currentUserObj) {
  // user ID + current time + random number
  return `${currentUserObj._id}_${Date.now()}_${Math.floor(Math.random() * 99999999)}`;
}

app.saveFileInfo = async function(imageInfo) {
  try {
    return await mongoDb.collection('images').insertOne(imageInfo);
  }
  catch (err) {
    console.log('Error saving file info:', err);
  }
}

// Called by storeFileByUrl to handle the actual saving of the file
app.downloadFile = async (url, filePath, fileName, currentUserObj) => {
  const absoluteFilePath = path.join(filePath, fileName);
  const response = await axios({
    url,
    responseType: 'stream',
  });

  // write file to disk
  return new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(absoluteFilePath))
      .on('finish', () => resolve(absoluteFilePath, currentUserObj))
      .on('error', (e) => reject(e));
  }).then(async (absoluteFilePath) => {
    // read the first 4100 bytes of the file to determine the file type
    const buffer = await readChunk(absoluteFilePath, {length: 4100});
    const fileMetadata = await fileTypeFromBuffer(buffer);
    const fileNameWithExt = `${fileName}.${fileMetadata.ext}`;
    const absoluteFilePathWithExt = `${absoluteFilePath}.${fileMetadata.ext}`;
    // rename the file on disk to include the file extension
    fs.rename(absoluteFilePath, absoluteFilePathWithExt, (err) => {
      if (err) {
        console.log('Error renaming file:', err);
      }
    });

    app.saveFileInfo({
      fileName: fileNameWithExt,
      absoluteFilePath: absoluteFilePathWithExt,
      filePath,
      mimeType: fileMetadata.mime,
      ext: fileMetadata.ext,
      owner: currentUserObj._id,
      createdAt: Date.now(),
    });
  });
};

// top level file storage handler
app.storeFileByUrl = async function (imageUrl, req) {
  if (!imageUrl) {
    console.log('Image URL is required');
    return false;
  }

  const currentUserObj = await JSON.parse(req.body.currentUser);
  const fileName = getFileName(currentUserObj);
  const filePath = path.join(__dirname, SAVE_FILE_PATH);
  try {
    // Ensure the downloads directory exists
    if (!fs.existsSync(path.join(__dirname, SAVE_FILE_PATH))) {
      fs.mkdirSync(path.join(__dirname, SAVE_FILE_PATH));
    }
    await app.downloadFile(imageUrl, filePath, fileName, currentUserObj);
    console.log(`Image saved as ${fileName}`);
    return fileName;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error(error);
  }
};

// Creating the /test route
app.get('/api/test', (req, res) => {
  console.log('TEST ROUTE SUCCESSFUL');
  res.send('API IS WORKING');
});
