import * as fs from "fs";


const CDK_MAIN_TS_DIR = process.env.CDK_MAIN_TS_DIR|| './main.ts'

export function readCDKFile() {
    console.log("Reading CDKTF main.ts file from: ", CDK_MAIN_TS_DIR)

    try {
        var data = fs.readFileSync(`${CDK_MAIN_TS_DIR}/main.ts`, 'utf8').toString().split("\n");
        return data;
    } catch (err) {
        if (err instanceof Error){
            console.log(err.message);
        }
    }

}

export function generateStackConfig(config: { environment: any; stack: any; config: any; }): boolean {
    var updated = false;
    var tfDeclatation = `new ${config.stack}(app, "${config.environment}", getBaseConfig(base), ${JSON.stringify(config.config)})`;
    console.log(tfDeclatation);
    if(writeStackDeclaration(tfDeclatation)){
        updated = true;
    }

    return updated;
}

export function writeStackDeclaration(declaration: string): boolean {
    console.log("Writing TF Declaration to file...")
    var updated = false;
    var mainFileArr = readCDKFile();
    if (mainFileArr instanceof Array) {
        for (let i = 0; i < mainFileArr.length; i++) {
            if (mainFileArr[i].includes(declaration)) {
                console.log("Environment Declaration already exists.\nSkipping entry...")
                return updated;
            }
        }
    }

    try {
        if(Array.isArray(mainFileArr)) {
            console.log("appending changes")
            var lineNumber = mainFileArr.length-3;
            mainFileArr.splice(lineNumber, 0, "\n");
            mainFileArr.splice(lineNumber, 0, declaration);
            var data = mainFileArr.join("\n");
            try {
                console.log("CDK DIR: ", `${CDK_MAIN_TS_DIR}`);
                fs.writeFileSync(`${CDK_MAIN_TS_DIR}/main.ts`, data)
                updated = true;
            } catch (err) {
                if (err instanceof Error) {
                    console.log(err.stack)
                    return updated;
                }
            }
        }
    } catch (err) {
        if (err instanceof Error) {
            console.log(err.stack)
            return updated;
        }
    }

    return updated;
}