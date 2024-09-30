import OpenAI from 'openai';

const OPEN_API_KEY = process.env.OPEN_API_KEY;
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

const generateImageConcept = async (req) => {
  const textPrompt = generateTextPrompt(req.body.userInput);
  console.log('generating concept');
  const conceptResponse = await openai.chat.completions.create({
    messages: [{ role: "user", content: textPrompt }],
    model: "gpt-3.5-turbo",
    // model: "gpt-4-1106-preview",
  });
  return conceptResponse.choices[0].message.content
}

const generateImage = async (conceptPrompt) => {
  const result = await openai.images.generate({
    prompt: conceptPrompt,
    model: 'dall-e-3',
    quality: 'hd',
    size: '1024x1024',
    style: 'vivid',
    n: 1,
  });
  return result;
};

export { generateTextPrompt, generateImageConcept, generateImage };
