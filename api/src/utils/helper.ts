import * as fs from "fs";


const CDK_MAIN_TS_PATH = process.env.CDK_MAIN_TS_PATH || './main.ts'

export function readCDKFile() {
    console.log("Reading CDKTF main.ts file from: ", CDK_MAIN_TS_PATH)

    try {
        var data = fs.readFileSync(CDK_MAIN_TS_PATH, 'utf8').toString().split("\n");
        return data;
    } catch (err) {
        if (err instanceof Error){
            console.log(err.message);
        }
    }

}

export function generateStackConfig(config: { environment: any; stack: any; config: any; }) {
    var tfDeclatation = `new ${config.stack}(app, "${config.environment}", getBaseConfig(base), ${JSON.stringify(config.config)})`;
    console.log(tfDeclatation);
    writeStackDeclatation(tfDeclatation);
}

export function writeStackDeclatation(declaration: string) {
    console.log("Writing TF Declaration to file...")
    var mainFileArr = readCDKFile();
    if (String.prototype.includes(declaration)) {
        console.log("Stack has already been declared. Skipping...")
        return;
    }

    try {
        if(Array.isArray(mainFileArr)) {
            var lineNumber = mainFileArr.length-3;
            mainFileArr.splice(lineNumber, 0, "\n");
            mainFileArr.splice(lineNumber, 0, declaration);
            var data = mainFileArr.join("\n");
            console.log(data);
        }
    } catch (err) {
        if (err instanceof Error) {
            console.log(err.stack)
            return;
        }
    }
}