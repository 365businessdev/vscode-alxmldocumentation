import { ALObject } from "./al-types/ALObject";
import { workspace, window, ProgressLocation, RelativePattern, Uri } from "vscode";
import { readFile } from "fs-extra";
import { ALSyntaxUtil } from "./util/ALSyntaxUtil";

export class ALXmlDoc {

    constructor() {

    }

    public async Initialize(): Promise<Array<ALObject>> {
        let alObjects: Array<ALObject> = [];
        try 
        {
            await window.withProgress({
                location: ProgressLocation.Window,
                title: 'AL XML Documentation initialization in progress...',
            }, async (progress, token) => {
                let workspacePaths = workspace.workspaceFolders;
                if ((!workspacePaths) || (workspacePaths === undefined)) {
                    throw new Error("Workspace folders could not be retreived.");
                }
    
                for (let validPath of workspacePaths) {
                    let allFiles = await workspace.findFiles(new RelativePattern(validPath, '**/*.al'), undefined, undefined, token);
                    let relevantFileTasks = allFiles.map(async (file: Uri) => {
                        let content = await readFile(file.fsPath, 'utf-8');
                        if (content.match(/(procedure)\s+(.*?)\(/gm)) {
                            return { uri: file, content: content };
                        }
    
                        return undefined;
                    });
                    let relevantFiles = await Promise.all(relevantFileTasks);
                    relevantFiles = relevantFiles.filter(f => f);
    
                    let tasks: Array<Promise<void>> = [];
                    let task = async (file: { uri: Uri, content: string }) => {
                        let document = Object.assign({});
                        document.uri = file.uri;
                        document.getText = () => file.content;
                        document.filename = file.uri.fsPath;
                        
                        let alObject: ALObject|null = ALSyntaxUtil.GetObject(document as any);
                        if (alObject !== null) {
                            alObjects.push(alObject);
                        } else {
                            console.log(`${document.uri} could not be parsed.`);
                        }
                    };
                    let max = relevantFiles.length;
                    for (let i = 0; i < max; i++) {
                        let file = relevantFiles[i];
                        tasks.push(task(file!));
    
                        if (i % 500 == 0) {
                            await Promise.all(tasks);
                            tasks = [];
                        }
                    }
    
                    if (tasks.length > 0) {
                        await Promise.all(tasks);
                    }
                }
    
                return true;
            });
        }
        catch (ex)
        {
            console.debug(ex);
        }
        return alObjects;
    }
}