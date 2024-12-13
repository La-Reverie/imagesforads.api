import { MongoClient } from 'mongodb';


const database = (process.env.NODE_ENV === 'prod') ? 'imagesforads' : 'imagesforads-test';
const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@imagesforads.sqyde.mongodb.net/?retryWrites=true&w=majority&appName=imagesforads`;
let dbInstance;

// Create a function to connect to MongoDB and reuse the connection
async function connectToDatabase() {
  if (dbInstance) {
    console.log('Using existing database connection');
    return dbInstance;
  }

  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Connect to the MongoDB cluster
    await client.connect();

    // Select the database you want to work with
    dbInstance = client.db(database);
    console.log(`Connected to database ${database} successfully`);

    return dbInstance;
  } catch (error) {
    console.error('Could not connect to the database', error);
    throw error;
  }
}

// Export the function to connect to the database
export default connectToDatabase;