import axios from 'axios';
import mimeTypes from 'mime-types';
import connectToDatabase from './MongoConnect.js';

const mongoDb = await connectToDatabase();

// Storage and CDN info
const STORAGE_ZONE = 'images-for-ads-ai';
const FILE_SAVE_PATH = 'generated-images';
const CDN_API_KEY = process.env.BUNNYCDN_APY_KEY;
const CDN_STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}/${FILE_SAVE_PATH}`;
const CDN_BASE_PATH = 'https://cdn.forads.ai/generated-images';

async function uploadToCDN(imageUrl, req) {
  try {
    console.log('uploading image to CDN');
    const mimeType = await getMimeType(imageUrl);
    const extension = mimeTypes.extension(mimeType);
    // Step 1: Download the image from the URL
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const currentUserObj = await JSON.parse(req.body.currentUser);
    const account = await JSON.parse(req.body.account);
    const fileName = getFileName(currentUserObj, extension);
    // Step 2: Upload the image directly to BunnyCDN
    const uploadResponse = await axios.put(`${CDN_STORAGE_URL}/${fileName}`, response.data, {
      headers: {
        'AccessKey': CDN_API_KEY,
        'Content-Type': 'application/octet-stream', // For binary data
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Image uploaded successfully:', uploadResponse.status);

    const imageInfo = {
      originalUrl: imageUrl,
      publicUrl: `${CDN_BASE_PATH }/${fileName}`,
      fileName: fileName,
      mimeType: mimeType,
      ext: extension,
      userId: currentUserObj._id,
      accountId: account._id,
      createdAt: Date.now(),
    };

    const result = await saveFileInfo(imageInfo, req);
    imageInfo._id = result.insertedId;
    return imageInfo;

  } catch (error) {
    console.error('Error uploading to BunnyCDN:', error.message);
  }
}

function getFileName (currentUserObj, extension) {
  // user ID + current time + random number + extension
  return `${currentUserObj._id}_${Date.now()}_${Math.floor(Math.random() * 99999999)}.${extension}`;
}

async function saveFileInfo(imageInfo, req) {
  try {
    return await mongoDb.collection('images').insertOne(imageInfo);
  }
  catch (err) {
    console.log('Error saving file info:', err);
  }
}

async function getMimeType(fileUrl) {
  try {
    // Make a HEAD request to get headers only
    const response = await axios.head(fileUrl);
    // Extract the Content-Type header
    return response.headers['content-type'];
  } catch (error) {
    console.error('Error fetching MIME type:', error.message);
    return null;
  }
}


export { uploadToCDN };
