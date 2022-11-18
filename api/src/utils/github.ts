import {SimpleGit, simpleGit, SimpleGitOptions} from "simple-git";
import {SimpleGitApi} from "simple-git/dist/src/lib/simple-git-api";

export class Github {
    private options: Partial<SimpleGitOptions>
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

    async resetCdkRepo() {
        console.log("Resetting CDKTF Repo to HEAD");
        try {
            await this.git.reset()
            console.log("Git reset completed...")
        } catch (err) {
            if (err instanceof Error) {
                console.log(err.stack);
                return;
            }
        }
    }
}