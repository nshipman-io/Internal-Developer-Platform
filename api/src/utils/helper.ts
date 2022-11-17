import * as fs from "fs";


const CDK_MAIN_TS_PATH = process.env.CDK_MAIN_TS_PATH || './main.ts'

export function readCDKFile() {
    console.log("Reading CDKTF main.ts file from: ", CDK_MAIN_TS_PATH)
    try {
        const data = fs.readFileSync(CDK_MAIN_TS_PATH, 'utf8');
        console.log("File content:", data);
    } catch (err) {
        if (err instanceof Error){
            console.log(err.message);
        }
    }
}