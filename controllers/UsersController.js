import dbClient from "../utils/db";
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

class UsersController {
    static async postNew(req, res) {
        const {email, password} = req.body;

        if(!email) {
            res.status(400).json({error: 'Missing email'});
        }
        if(!password) {
            res.status(400).json({error: 'Missing password'});
        }

        const hashPassword = sha1(password);

        try{
            const collection = dbClient.db.collection('users');
            const user = await collection.findOne({email});
            if(user) {
                res.status(400).json({error: 'Already exist'});
            } else {
                collection.insertOne({email, password: hashPassword});
                const newUser = await collection.findOne(
                    {email}, {projection: { email: 1 } }
                );
                res.status(201).json({id: newUser._id, email: newUser.email});
            }
        }catch(error){
            console.log(error)
            response.status(500).json({ error: 'Server error' });
        }
    }
}

export default UsersController;