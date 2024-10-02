import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
    static getStatus(req, res) {
        try{
            //check is redis and mongodb are alive
            const redis = redisClient.isAlive();
            const db = dbClient.isAlive();

            //send response
            res.status(200).json({"redis": redis, "db": db });
        }catch(error) {
            console.log(error);
        }
    }

    static async getStats(req, res) {
        try{
            const nbUsers = await dbClient.nbUsers();
            const nbFiles = await dbClient.nbFiles();
            
            res.status(200).json({"users": nbUsers, "files": nbFiles});
        }catch(error){
            console.log(error);
        }
    }
}

export default AppController;