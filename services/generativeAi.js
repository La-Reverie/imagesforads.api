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
          containing just a few elements. Your response should be crafted specifically as a prompt for DALL-E 3.`;
};

const generateImageConcept = async (req) => {
  try {
    console.log('Starting generateImageConcept');
    const textPrompt = generateTextPrompt(req.body.userInput);
    console.log('Text prompt generated:', textPrompt);
    
    console.log('Calling OpenAI API...');
    const conceptResponse = await openai.chat.completions.create({
      messages: [{ role: "user", content: textPrompt }],
      model: "gpt-4o",
    });
    console.log('OpenAI API response received:', conceptResponse);
    
    return conceptResponse.choices[0].message.content;
  } catch (error) {
    console.error('Error in generateImageConcept:', error);
    throw error;
  }
}

const generateImage = async (conceptPrompt) => {
  try {
    console.log('Starting generateImage');
    console.log('Concept prompt:', conceptPrompt);
    
    console.log('Calling DALL-E API...');
    const result = await openai.images.generate({
      prompt: conceptPrompt,
      model: 'dall-e-3',
      quality: 'hd',
      size: '1024x1024',
      style: 'vivid',
      n: 1,
    });
    console.log('DALL-E API response received');
    
    return result;
  } catch (error) {
    console.error('Error in generateImage:', error);
    throw error;
  }
}

const combinePrompts = async (editPrompt, originalConceptPrompt) => {
  const prompt = `You are helping generate a refined prompt for an AI image generation system. Here's the situation:
                    1. The original image was created using the following concept prompt:
                      "${originalConceptPrompt}"

                    2. The user wants to make a specific edit to this image. Their instructions are:
                      "${editPrompt}"

                    Your task is to combine these two inputs into a single prompt for an AI inpainting system. The new prompt should:
                    - Retain all relevant details and context from the original image prompt.
                    - Include the user's specific edit instructions in a way that makes them clear and actionable.
                    - Be concise, clear, and formatted as a single paragraph that the inpainting system can use effectively.
                    - Instruct the AI to NEVER use text in ANY FORM in the image.

                    Please return the combined prompt.`;
  const result = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o",
  });
  return result.choices[0].message.content
}

export { generateTextPrompt, generateImageConcept, generateImage, combinePrompts };
