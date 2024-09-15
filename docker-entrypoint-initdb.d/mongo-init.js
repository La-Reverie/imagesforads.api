db = db.getSiblingDB('imagesforadsdb');

// Initialize collections
db.createCollection('users');
db.createCollection('images');
