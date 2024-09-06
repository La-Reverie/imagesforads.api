
import OpenAI from 'openai';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();


const app = express();



// we serve the html files first
const staticApp = express();
staticApp.use(express.static(path.join('/var/www/html')));
const STATIC_PORT = 80;

staticApp.listen(STATIC_PORT, () => {
  console.log(`Static server is running on port ${STATIC_PORT}`);
});

// now we move to the api
const PORT = process.env.PORT;
const OPEN_API_KEY = process.env.OPEN_API_KEY;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

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
                          SERVER IS RUNNING ON PORT ${PORT}                  
====================================================================================
                `);
  
});

const openai = new OpenAI({
  apiKey: OPEN_API_KEY,
});

app.post('/generate-concept', async (req, res) => {
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
    res.status(500).send("Error generating image");
  }
});

app.post('/generate-image', async (req, res) => {
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
    console.error("Error calling OpenAI API:", error);
    res.status(500).send("Error generating image");
  }
});
