import express from 'express';
import cors from 'cors';
import { router } from "../routes/environments";

export const app = express();

const corsConfig = {
    optionsSuccessStatus: 200
}

const environmentRouter = router;

app.use(cors(corsConfig));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.use("/environments", environmentRouter)

app.get('/healthz', (req, res) => {
    res.status(200).send('Ok');
});
