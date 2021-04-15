import { Uri } from "vscode";
import * as fs from 'fs';
import { FilesystemHelper } from "../filesystem/FilesystemHelper";

export class MarkdownWriter {

    private Filename: Uri;
    private IndentationLevel: number;

    /**
     * Base constructor to initialize MarkdownWriter class.
     * @param fileName Filename, including path, to write into.
     * @param initialContent Initial content for the new markdown file.
     */
    constructor(fileName: string, initialContent: string = '') {
        this.Filename = Uri.file(fileName);
        this.IndentationLevel = 0;

        if (initialContent === '') {
            initialContent = MarkdownWriter.GetInitialContent();
        }
        if (!FilesystemHelper.CreateFile(this.Filename.fsPath, initialContent)) {
            throw new Error(`Unable to create ${this.Filename}. Please verify permission set properly.`);            
        }
    }

    /**
     * Write code block to markdown file.
     * @param text 
     * @param language (default: al)
     */
    public WriteCode(text: string, language: string = 'al') {
        this.WriteLine('```' + language);
        this.WriteLine(text);
        this.WriteLine('```');
        this.WriteLine();
    }

    /**
     * Write heading text to markdown file.
     * @param text 
     * @param level
     */
    public WriteHeading(text: string, level: number) {
        let h: string = '';
        for (let i = 0; i < level; i++) {
            h += '#';
        }

        this.WriteLine(`${h} ${text}`);
        this.WriteLine();
    }

    public AddIndentationLevel(addIndentationLevel: number) {
        this.IndentationLevel += addIndentationLevel;
    }

    /**
     * Write text to markdown file.
     * @param text (optional)
     * @param addIndentationLevel (optional)
     */
    public WriteLine(text: string = '', addIndentationLevel: number = 0) {
        if (addIndentationLevel > 0) {
            this.AddIndentationLevel(addIndentationLevel);
        }
        let indent: string = '';
        for (let i = 0; i < this.IndentationLevel; i++) {
            indent += '&emsp;';
        }
        text = indent + text;
        fs.appendFileSync(this.Filename.fsPath, `${text}\n`);
    }

    /**
     * Returns initial content for new markdown files.
     * @returns Initial content for markdown files, containing style definitions.
     */
    private static GetInitialContent(): string {
        return `<style>${this.GetDefaultStylesheet()}</style>

`;
    }

    /**
     * Returns default stylesheet definition for markdown files.
     * @returns Default stylesheet definition .
     */
    public static GetDefaultStylesheet(): string {
        return `.page-header{margin:0 auto;font-family: Segoe UI Semibold;font-size: 10px;}.page-footer{margin-left: 50px;font-family:Segoe UI;font-size:9px}h1{font-size:28px}h2{font-size:26px}h3{font-size:23px}h4{font-size:22px}h5{font-size:20px}table{width:100%}`;
    }
}