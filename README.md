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

This repo uses a MongoDB Community database that is self-hosted. To initialize a local instance of of Mongo DB:

- Install Docker Desktop https://www.docker.com/products/docker-desktop/

- Create a folder structure outside of your local path to this repo <code>"../data/db"</code>. This is where the database volumes will live. In production, this is the origin from which the data will be backed up by Hostinger. The docker-compose.yaml file will need this path in order to mount the volumes. 

- Add a .env file to the root path of this repo with your MONGODB_USERNAME and 
MONGODB_PASSWORD values. These will be used to access your local MongoDB instance. 

- before running the server, run <code>docker-compose up</code> from the local directory of imagesforads.api. This will build your container locally and you should see it built and running in Docker Desktop.

-  To access the local mongo server, first run <code>docker exec -t -i imagesforadsapi-mongodb-1 /bin/bash</code>

- Once you're in the local Docker container, run <code>mongosh</code> , then <code>use admin</code>, then db.auth(username, password)

- These commands will authenticate you so you'll be able to access the collections. 