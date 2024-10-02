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

        const { userId } = await userUtils.getUserIdAndKey(req);
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
            return res.status(401).send({ error: 'Unauthorized' });   
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
            if (err) return res.status(400).send({ err: err.message });
            return true;
        });

        writeFile(filePath, decData, (err) => {
            if (err) return res.status(400).send({ err: err.message });
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

    static async getShow(req, res){
        const { userId } = await userUtils.getUserIdAndKey(req);
        if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });

        const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });
        const fileId = req.params.id || '';
        const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
        if (!file) return res.status(404).send({ error: 'Not found' });
    
        return res.status(200).send({
          id: file._id,
          userId: file.userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId: file.parentId
        });
    }

    static async getIndex (req, res) {
        const { userId } = await userUtils.getUserIdAndKey(req);
        if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });
    
        const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });
    
        let parentId = req.query.parentId || 0;
        if (parentId === '0') parentId = 0;
        if (parentId !== 0) {
          if (!userUtils.isValidId(parentId)) return res.status(401).send({ error: 'Unauthorized' });
    
          parentId = ObjectId(parentId);
    
          const folder = await dbClient.files.findOne({ _id: ObjectId(parentId) });
          if (!folder || folder.type !== 'folder') return res.status(200).send([]);
        }
    
        const page = req.query.page || 0;
    
        const agg = { $and: [{ parentId }] };
        let aggData = [{ $match: agg }, { $skip: page * 20 }, { $limit: 20 }];
        if (parentId === 0) aggData = [{ $skip: page * 20 }, { $limit: 20 }];
    
        const pageFiles = await dbClient.files.aggregate(aggData);
        const files = [];
    
        await pageFiles.forEach((file) => {
          const fileObj = {
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId
          };
          files.push(fileObj);
        });
    
        return res.status(200).send(files);
    }

    static async putPublish (req, res) {
        const { userId } = await userUtils.getUserIdAndKey(req);
        if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });
    
        const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });
    
        const fileId = req.params.id || '';
    
        let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
        if (!file) return res.status(404).send({ error: 'Not found' });
    
        await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
        file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
    
        return res.status(200).send({
          id: file._id,
          userId: file.userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId: file.parentId
        });
      }
    
    static async putUnpublish (req, res) {
        const { userId } = await userUtils.getUserIdAndKey(req);
        if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });

        const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });

        const fileId = req.params.id || '';

        let file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });
        if (!file) return res.status(404).send({ error: 'Not found' });

        await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
        file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId: user._id });

        return res.status(200).send({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId
        });
    }

    static async getFile (req, res) {
        const fileId = req.params.id || '';
        const size = req.query.size || 0;
    
        const file = await dbClient.files.findOne({ _id: ObjectId(fileId) });
        if (!file) return res.status(404).send({ error: 'Not found' });
    
        const { isPublic, userId, type } = file;
    
        const { userId: user } = await userUtils.getUserIdAndKey(req);
    
        if ((!isPublic && !user) || (user && userId.toString() !== user && !isPublic)) return res.status(404).send({ error: 'Not found' });
        if (type === 'folder') return res.status(400).send({ error: 'A folder doesn\'t have content' });
    
        const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;
    
        try {
          const fileData = readFileSync(path);
          const mimeType = mime.contentType(file.name);
          res.setHeader('Content-Type', mimeType);
          return res.status(200).send(fileData);
        } catch (err) {
          return res.status(404).send({ error: 'Not found' });
        }
    }
    
}

export default FilesController