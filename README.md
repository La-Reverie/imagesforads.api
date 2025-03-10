# imagesforads.api
This is the API for the imagesforads frontend.

The frontend makes API calls to the generate route on this backend. The generate route accesses the OpenAI API key via environment variable and makes subsequent API calls to the ChatGPT (text) and Dal*e (image) AIs.

# Configuration
In the terminal, do:

`$ export OPENAI_API_KEY={the secret API key}`

This will save the API key in the local environemnt so the server can read it at runtime. Next, do:

`$ PORT=3000 node server.js`

This will set the http port to 3000 and run the Node.js EXPRESS server. (the port definition must come before `node` command or else it will be UNDEFINED.

If everything worked, you should see something like this:

Server running on port 3000

And when you run the frontend and submit the form, an API call will be made to that endpoint, and you'll server server logs printed on this screen for debugging purposes.

# MongoDB

This repo uses a MongoDB Atlas:

- Add your MONGODB_USERNAME and MONGODB_PASSWORD to your .env file.

To connect to the Atlas cluster via SSH: 

- install mongosh `brew install mongosh`

- run `mongosh "mongodb+srv://imagesforads.sqyde.mongodb.net/" --apiVersion 1 --username <your_db_username>`

- You will be prompted for the password for the Database User, <db_username>

Once you're in the cluster you can run some common commands like: 

Show all databases: `show dbs`

Use a specific database: `use imagesforads`

Find a record in the users table: `db.getCollection("users").findOne({name: 'Jon'})`