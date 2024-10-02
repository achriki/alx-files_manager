import express from 'express';
import AppController from '../controllers/AppController';

const router = express.Router();

const routerController = (app) => {
    app.use('/', router);

    router.get('/status', (req, res) => {
        AppController.getStatus(req, res);
    })

    router.get('/stats', (req, res) => {
        AppController.getStats(req, res);
    })
}

export default routerController;