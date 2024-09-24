import OpenAI from 'openai';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken'
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();

// Now we move to the API
const PORT = process.env.PORT || 3001;  
// const OPEN_API_KEY = process.env.OPEN_API_KEY;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

//Mongo
let mongoDb;

const uri = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@127.0.0.1:27017`;
MongoClient.connect(uri, function(err, database) {
  if(err){
    console.log("ERROR: ", err)
  }

  mongoDb = database.db("imagesforadsapi-mongodb-1");

  // Start the application after the database connection is ready
  app.listen(27017);
  console.log("database connected! Listening on port 27017");
});

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

// const openai = new OpenAI({
//   apiKey: OPEN_API_KEY,
// });

app.post('/api/generate-concept', async (req, res) => {
  console.log('Generating concept');
  try {
    console.log(req.body.prompt);
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: req.body.prompt }],
      model: "gpt-3.5-turbo",
      // model: "gpt-4-1106-preview",
    });

    console.log(response);
    res.send(response);
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).send("Error generating concept");
  }
});

app.post('/api/generate-image', async (req, res) => {
  console.log('Generating image');
  try {
    console.log(req.body.prompt);
    const response = await openai.images.generate({
      prompt: req.body.prompt,
      model: 'dall-e-3',
      quality: 'hd',
      size: '1024x1024',
      style: 'vivid',
      n: 1,
    });

    console.log(response);
    res.send(response);
  } catch (error) {
    console.error("Error generating image", error);
    res.status(500).send("Error generating image");
  }
});

app.post('/api/authenticate', async (req, res) => {
  try{
      const { credential } = req?.body;
      
      console.log(">>> decoded SSO credential from client", jwt.decode(credential));

      const decodedGoogleObj = jwt.decode(credential);

      if(decodedGoogleObj){
        // check if a user already exists in the db
        // if not, add a new record
        // if yes, use info from the existing record
        // build an authentication object and send to client with a JWT
      }
      else{
        res.send({authenticated: false, errorText: "Invalid Credentials"})
      }

      //temp response
      const authRes = { authenticated:true };
      res.json(authRes);

  }
  catch(error){
    console.log("ERROR: ", error)
  }
})