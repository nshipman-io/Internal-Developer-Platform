import {spawn, spawnSync} from "child_process";

//TODO: Can likely consolidate these tasks to a single function

export function deployStack(name: string): [boolean, string] {

    var deployed = false;
    var notes = "";
    const CDK_MAIN_TS_DIR = process.env.CDK_MAIN_TS_DIR || './';

    process.chdir(CDK_MAIN_TS_DIR);
    const cdktfApply = spawnSync('cdktf',['deploy', `${name}`, '--ignore-missing-stack-dependencies', '--auto-approve'], {
        stdio: 'pipe',
        encoding: 'utf-8',
    });

    if(cdktfApply.status === 0) {
        deployed = true;
        console.log(`stdout:\n${cdktfApply.stdout}`)
        notes = cdktfApply.stdout;
    }
    else {
        console.log(`stderr:\n${cdktfApply.stderr}`)
        notes = cdktfApply.stderr;
    }

    return [deployed, notes];
}

export function destroyStack(name: string): [boolean, string]  {
    var destroyed = false;
    var notes = "";

    const CDK_MAIN_TS_DIR = process.env.CDK_MAIN_TS_DIR || './';

    process.chdir(CDK_MAIN_TS_DIR);

    const cdktfDestroy = spawnSync('cdktf',['destroy', `${name}`, '--ignore-missing-stack-dependencies', '--auto-approve'],{
        stdio: 'pipe',
        encoding: 'utf-8'
    });

    if (cdktfDestroy.status === 0) {
        destroyed = true;
        console.log(`stdout:\n${cdktfDestroy.stdout}`);
    } else {
        console.log(`stderr:\n${cdktfDestroy.stderr}`);
        notes = cdktfDestroy.stderr;
    }

    return [destroyed, notes];

}