import { app } from './app/index'

const port: any = process.env.PORT ?? 3000;

const server = app.listen(port, ()=> {
    console.log(`Webserver running on port ${port}`)
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