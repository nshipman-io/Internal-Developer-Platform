import express from 'express';
import process from 'process';
import cors from 'cors';

const port: any = process.env.PORT ?? 3000;

const app = express();

const corsConfig = {
    origin: 'https://google.com',
    optionsSuccessStatus: 200
}

app.use(cors(corsConfig));

app.get('/', (req, res) => {
    res.send('Hello World!')
});

const server = app.listen(port, ()=> {
    console.log(`Weberver running on port ${port}`)
    console.log('CORS is enabled on webserver')
});


function signalHandler(signal: string) {
    console.info(`${signal} received.`);
    console.log('Closing webserver.');
    server.close(()=> {
        console.log('webserver closed.')
        process.exit(0);
    });
}

process.on('SIGTERM', ()=> signalHandler('SIGTERM'));
process.on('SIGINT', () => signalHandler('SIGINT'));