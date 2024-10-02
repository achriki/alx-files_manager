import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;

class DBClient {
    constructor() {
        this.db = null;
        MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
            if (!error) {
                this.db = client.db(database);
                this.users = this.db.collection('users');
                this.files = this.db.collection('files');
              } else {
                console.log(error.message);
                this.db = false;
              }
        });
    }

    isAlive() {
        return !!this.db;
    }

    async nbUsers() {
        return this.db.collection('users').countDocuments();
    }

    async nbFiles() {
        return this.db.collection('files').countDocuments();
    }
}

const dbClient = new DBClient();

export default dbClient;