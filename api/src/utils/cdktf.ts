import {spawn} from "child_process";

export function applyChanges(name: string) {
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