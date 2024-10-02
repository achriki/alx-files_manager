import redisClient from "../utils/redis";
import Queue from 'bull';
import dbClient from "../utils/db";
import userUtils from "../utils/users";
import { v4, uuidv4 } from "uuid";
import { mkdir, writeFile, readFileSync } from 'fs';
const Types = ['folder', 'file', 'image']

class FilesController {
    static async postUpload(req, res) {
        const {name, type, parentId, isPublic, data} = req.body;
        const dir = process.env.FOLDER_PATH || '/tmp/files_manager';
        const fileQ = new Queue('fileQ');
        
        if(!name) {
            return res.status(400).json({ error: 'Missing name' });
        }
        if(!type || !Types.includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }

        const { userId } = await userUtils.getUserIdAndKey(request);
        if(!userUtils.isValidId(userId)) {
            return res.status(401).send({ error: 'Unauthorized' });
        }

        if(type != 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }
        if(parentId) {
            const file = dbClient.collection('files').findOne({ _id: ObjectId(parentId) })
            if(!file){
                return res.status(400).json({ error: 'Parent not found' });
            } else {
                if(file.type != 'folder') {
                    return res.status(400).json({ error: 'Parent is not a folder' });
                }
            }
        }
        const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
        if(!user) {
            return response.status(401).send({ error: 'Unauthorized' });   
        }

        const fileInsertObject = {
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
        }
        
        if(type === 'folder') {
            await dbClient.files.insertOne({fileInsertObject});
            return res.status(201).send({
                id: fileInsertData._id,
                userId: fileInsertData.userId,
                name: fileInsertData.name,
                type: fileInsertData.type,
                isPublic: fileInsertData.isPublic,
                parentId: fileInsertData.parentId
            });
        }

        const fileId = uuidv4();
        const decData = Buffer.from(data, 'base64');
        const filePath = `${dir}/${fileId}`;

        mkdir(dir, {recursive: true}, (err) => {
            if (err) return response.status(400).send({ err: err.message });
            return true;
        });

        writeFile(filePath, decData, (err) => {
            if (err) return response.status(400).send({ err: err.message });
            return true;
        })

        fileInsertObject.localPath = filePath;
        dbClient.files.insertOne({fileInsertObject});

        fileQ.add({
            userId: fileInsertData.userId,
            fileId: fileInsertData._id
        });
        
        return res.status(201).send({
            id: fileInsertData._id,
            userId: fileInsertData.userId,
            name: fileInsertData.name,
            type: fileInsertData.type,
            isPublic: fileInsertData.isPublic,
            parentId: fileInsertData.parentId,
            localPath: fileInsertObject.localPath
        });
    }
}

export default FilesController