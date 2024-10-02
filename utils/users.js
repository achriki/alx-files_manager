import redisClient from "./redis";
import dbClient from "./db";

class userUtils {
    async getUserIdAndKey(req) {
        const obj = { userId: null, key: null };

        const xToken = request.header('X-Token');
    
        if (!xToken) return obj;
    
        obj.key = `auth_${xToken}`;
    
        obj.userId = await redisClient.get(obj.key);
    
        return obj;
    }

    async isValidId(id) {
        try {
            ObjectId(id);
        } catch (err) {
            return false;
        }
        return true;
    }
}

export default userUtils