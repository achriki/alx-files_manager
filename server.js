import express from "express";
import routerController from "./routes";

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
routerController(app);

app.listen(port, (err) => {
    if(err) {
        console.log(err.message);
    }

    console.log(`Server running on port ${port}`);
});

export default app