import {spawn} from "child_process";

export function applyChanges(name: string) {
    const CDK_MAIN_TS_DIR = process.env.CDK_MAIN_TS_DIR || './';

    process.chdir(CDK_MAIN_TS_DIR);
    const cdktfApply = spawn('cdktf',['apply', `${name}`]);
    var exitCode;
    cdktfApply.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`)
    });

    cdktfApply.stderr.on('data',(data) => {
        console.log(`stderr: ${data}`);
    });

    cdktfApply.on('close', (code) => {
        console.log(`process closed with error code: ${code}`)
        exitCode = code
    })

    return exitCode;
}