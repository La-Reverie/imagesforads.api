import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';
import { readChunk } from 'read-chunk';
import connectToDatabase from './MongoConnect.js';

const mongoDb = await connectToDatabase();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE_PATH = '../../generated-images';

const storeFileByUrl = async function(imageUrl, req) {
  const currentUserObj = await JSON.parse(req.body.currentUser);
  const fileName = getFileName(currentUserObj);
  const filePath = path.join(__dirname, SAVE_FILE_PATH);

  try {
    // Ensure the downloads directory exists
    if (!fs.existsSync(path.join(__dirname, SAVE_FILE_PATH))) {
      fs.mkdirSync(path.join(__dirname, SAVE_FILE_PATH));
    }
    return await downloadFile(imageUrl, filePath, fileName, currentUserObj, req);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error(error);
  }
};

async function downloadFile(url, filePath, fileName, currentUserObj, req) {
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
    const imageInfo = {
      fileName: fileNameWithExt,
      absoluteFilePath: absoluteFilePathWithExt,
      filePath,
      mimeType: fileMetadata.mime,
      ext: fileMetadata.ext,
      owner: currentUserObj._id,
      createdAt: Date.now(),
    };

    const result = await saveFileInfo(imageInfo, req);
    imageInfo._id = result.insertedId;
    return imageInfo;
  });
};

const getFileName = function (currentUserObj) {
  // user ID + current time + random number
  return `${currentUserObj._id}_${Date.now()}_${Math.floor(Math.random() * 99999999)}`;
}

async function saveFileInfo(imageInfo, req) {
  try {
    return await mongoDb.collection('images').insertOne(imageInfo);
  }
  catch (err) {
    console.log('Error saving file info:', err);
  }
}

export { storeFileByUrl };