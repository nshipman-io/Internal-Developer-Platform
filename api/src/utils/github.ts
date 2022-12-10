import {ResetMode, SimpleGit, simpleGit, SimpleGitOptions} from "simple-git";

export class Github {
    public options: Partial<SimpleGitOptions>
    public git: SimpleGit


    constructor() {
        this.options = {
            baseDir: process.cwd(),
            binary: 'git',
            maxConcurrentProcesses: 6,
            trimmed: false,
        };

        this.git = simpleGit(this.options);
    }

    /*
        TODO: Automate repository initialization
            - npm install in the infrastructure directory
            - cdktf get in the infrastructure directory
     */

    async cloneCdkRepo() {
        console.log("Cloning CDKTF Infrastructure directory");
        try {
            await this.git.clone("git@github.com:nshipman-io/Internal-Developer-Platform.git", "/Users/nshipman/tmp")
            console.log("Success - CDKTF Clone")
        } catch (err) {
            if (err instanceof Error) {
                console.log(err.message);
                return;
            }
        }

    }

    resetCdkRepo() {
        console.log("Resetting cdktf repo to HEAD");
        try {
            this.git.reset(ResetMode.HARD, ["origin/main"] )
            console.log("Git reset completed...")
        } catch (err) {
            if (err instanceof Error) {
                console.log(err.stack);
                return;
            }
        }
    }

    publishChanges(): boolean {
        var committed = false;
        var CDK_MAIN_TS_DIR = process.env.CDK_MAIN_TS_DIR;
        //const debug = require('debug');
        //debug.enable('simple-git,simple-git:*');

        console.log("Committing cdktf main.ts changes to repo...")
        try {
            this.git.add(`${CDK_MAIN_TS_DIR}/main.ts`)
            console.log(`${CDK_MAIN_TS_DIR}/main.ts`)
            this.git.commit("Updating CDKTF main.ts");
            this.git.push();
            committed = true;
        } catch (err) {
            if (err instanceof Error) {
                console.log(err.message);
                committed = false;
            }
        }
        return committed;
    }
}