import * as fs from 'fs';
import path = require('path');
import { OutputChannel, Uri } from 'vscode';
import { ALObjectCache } from '../ALObjectCache';
import { ALAccessLevel } from '../types/ALAccessLevel';
import { ALCodeunitType } from '../types/ALCodeunitType';
import { ALObject } from '../types/ALObject';
import { ALObjectExtensionType } from '../types/ALObjectExtensionType';
import { ALObjectType } from '../types/ALObjectType';
import { ALObsoleteState } from '../types/ALObsoleteState';
import { ALProcedure } from '../types/ALProcedure';
import { ALProcedureType } from '../types/ALProcedureType';
import { XMLDocumentationExistType } from '../types/XMLDocumentationExistType';
import { ALAppJsonReader } from './ALAppJsonReader';
import { ALDocCommentUtil } from './ALDocCommentUtil';
import { Configuration } from './Configuration';
import { FilesystemHelper } from './filesystem/FilesystemHelper';
import { MarkdownWriter } from './markdown/MarkdownWriter';
import { StringUtil } from './string/StringUtil';

export class ALObjectDocumentationExport {

    private static output: OutputChannel|null = null;

    /**
     * Initialize ALObjectDocumentationExport
     * @param output OutputChannel
     */
    private static Initialize(output: OutputChannel) {
        this.output = output;
    }

    /**
     * Read app.json file from workspace.
     * @returns app.json
     */
    private static ReadAppJson(): any {        
        let appJsonPath : Uri | null = Configuration.GetWorkspaceRootFolder();
        if (appJsonPath === null) {
            this.WriteOutput('Unable to determine current workspace. Please report this issue to https://github.com/365businessdev/vscode-alxmldocumentation/issues/ for further investigation.');
            throw new Error('Unable to determine current workspace.');
        }
        if (!fs.existsSync(path.join(appJsonPath.fsPath, 'app.json'))) {
            this.WriteOutput('Unable to find app.json for current workspace. Please report this issue to https://github.com/365businessdev/vscode-alxmldocumentation/issues/ for further investigation.');
            throw new Error('Unable to find app.json for current workspace.');
        }
        return ALAppJsonReader.ReadManifest(path.join(appJsonPath.fsPath, 'app.json'));
    }

    /**
     * Returns documentation export path from configuration.
     * @returns filesystem path
     */
    public static GetDocumentationExportPath(): string {
        let path: string = Configuration.DocumentationExportPath();
        if (path === "") {
            throw new Error('Export Path for Documentation has not been configured. Please verify setup and try again.');
        }
        FilesystemHelper.CreateDirectoryIfNotExist(path);
        return path;
    }

    private static GetPdfOptions(): string {
        let customCSS = Configuration.PdfDocumentationExportCSS();
        if (customCSS === '') {
            customCSS = MarkdownWriter.GetDefaultStylesheet();
        }

        return `---
pdf_options:
  format: a4
  margin: 30mm 20mm
  printBackground: true
  headerTemplate: |-
    <style>
      ${customCSS}
    </style>
    <div class="page-header">
      AL Source Code Documentation
    </div>
  footerTemplate: |-
    <div class="page-footer">
      <span class="date"></span>
      <div>
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        <p style="font-size: 7px">powered by AL XML Documentation for Visual Studio Code</p>
      </div>
    </div>
---

`;
    }

    public static async ExportAsPdf(output: OutputChannel) {
        this.Initialize(output);

        const appJson = this.ReadAppJson();
        let doc = new MarkdownWriter(`${this.GetDocumentationExportPath()}/${appJson.name.replace(/\s/mg, '_')}.md`, this.GetPdfOptions());
        await this.ExportIndex(output, doc);

        let alObjects = ALObjectCache.ALObjects;
        for (const alObject of  alObjects) {
            doc.WriteLine();
            doc.WriteLine('<div class="page-break"></div>');
            doc.WriteLine();
            output.appendLine(`${StringUtil.GetTimestamp()} Exporting documentation for ${ALObjectType[alObject.Type]} ${alObject.Name} . . . `);
            await ALObjectDocumentationExport.ExportObject(alObject, output, true, doc);
        };

        try
        {
            const { mdToPdf } = require ('md-to-pdf');            
            const pdf = await mdToPdf({ path: `${this.GetDocumentationExportPath()}/${appJson.name.replace(/\s/mg, '_')}.md` }).catch(console.error);
            
            if (pdf) {
                fs.writeFileSync(`${this.GetDocumentationExportPath()}/${appJson.name.replace(/\s/mg, '_')}.pdf`, pdf.content);
            } else {
                output.appendLine(`${StringUtil.GetTimestamp()} Error: Unable to create PDF file.`);
            }
        } catch (ex) {
            output.appendLine(ex);
        } finally {
            FilesystemHelper.DeleteFile(`${this.GetDocumentationExportPath()}/${appJson.name.replace(/\s/mg, '_')}.md`);
        }        
    }

    /**
     * Export project index.
     * @param output OutputChannel
     */
    public static async ExportIndex(output: OutputChannel, doc: MarkdownWriter|null = null) {
        this.Initialize(output);

        let isNewDoc: boolean = false;
        if (doc === null) {
            isNewDoc = true;
            doc = new MarkdownWriter(`${this.GetDocumentationExportPath()}/index.md`);
        }
        const appJson = this.ReadAppJson();
        let headingLevel = 1;

        this.WriteOutput(`Start creation project index for '${appJson.name}' . . .`, false);

        // write project summary
        doc.WriteHeading(appJson.name, headingLevel);
        doc.WriteLine();
        headingLevel++;
        doc.WriteHeading('Details', headingLevel);
        doc.WriteLine(`Version: ${appJson.version}<br>`);
        doc.WriteLine(`Publisher: ${appJson.publisher}<br>`);
        doc.WriteLine();
        doc.WriteLine(appJson.description);
        doc.WriteLine();
        doc.WriteHeading('Objects', headingLevel);

        headingLevel++;
        // write object list per object type
        for (const value of this.enumKeys(ALObjectType)) {
            let alObjects = ALObjectCache.ALObjects.filter(alObject => (ALObjectType[value] === alObject.Type));
            if (alObjects.length === 0) {
                continue;
            }
        
            doc.WriteLine();
            doc.WriteHeading(value, headingLevel);

            for (const alObject of alObjects) {
                let link: string = '';
                if (isNewDoc) {
                    if (Configuration.IncludeProcedureDocumentationInObjectDocumentationFile()) {
                        link = `${alObject.Name?.replace(/\s/mg, '_')}.md`;
                    } else {                    
                        link = `${alObject.Name?.replace(/\s/mg, '_')}/index.md`;
                    }
                } else {
                    link = `#${alObject.Name?.replace(/[\s\.]/mg, '-').toLowerCase()}`;
                }
                if (doc !== null) {
                    doc.WriteLine(` - [${alObject.Name}${alObject.ID !== undefined ? " (ID " + alObject.ID + ")" : ""}](${link})<br>`);
                    if (alObject.XmlDocumentation.Exists === XMLDocumentationExistType.Yes) {
                        let documentation = await alObject.GetDocumentationAsJsonObject();
                        doc.WriteLine(`<ul id="object-description"><i>${documentation.summary}</i></ul>\n`);
                    }
                }
            };
        }
        headingLevel--;

        // write app dependencies
        if ((appJson.dependencies) && (appJson.dependencies.length !== 0)) {
            doc.WriteLine();
            doc.WriteHeading('Dependencies', headingLevel);
            appJson.dependencies.forEach((alDependency: { name: string; publisher: string; version: string; }) => {
                if (doc !== null) {
                    doc.WriteLine(`**${alDependency.name}** by ${alDependency.publisher}<br>`);
                    doc.WriteLine(`&emsp;Version: ${alDependency.version}<br>`);    
                }            
            });
        }

        this.WriteOutput('Project index has been created successfully.', false);        
    }

    /**
     * Export AL Object documentation
     * @param alObject ALObject
     * @param output OutputChannel
     * @param includeProcedure boolean
     */
    public static async ExportObject(alObject: ALObject, output: OutputChannel, includeProcedure: boolean,doc: MarkdownWriter|null = null) {
        this.Initialize(output);

        // determine export file name
        let fileName: string = '';
        if (!includeProcedure) {
            fileName = `${this.GetDocumentationExportPath()}/${alObject.Name!.replace(/\s/mg, '_')}/index.md`;
        } else {
            fileName = `${this.GetDocumentationExportPath()}/${alObject.Name!.replace(/\s/mg, '_')}.md`;
        }
        if (doc === null) {
            doc = new MarkdownWriter(fileName);
        }

        let headingLevel = 1;

        // write object summary
        doc.WriteHeading(alObject.Name!, headingLevel); 
        
        doc.WriteLine();
        switch (alObject.XmlDocumentation.Exists) {
            case XMLDocumentationExistType.No:
                this.WriteOutput(`Warning: XML documentation could not been found for ${ALObjectType[alObject.Type]} ${alObject.Name}.`);
                break;
            case XMLDocumentationExistType.Yes:
                let documentation: any = await alObject.GetDocumentationAsJsonObject();
                doc.WriteLine(documentation.summary);
                if (documentation.remarks) {
                    doc.WriteHeading('Remarks', headingLevel);
                    doc.WriteLine(documentation.remarks);
                }
                break;
        }
        doc.WriteLine();               
        headingLevel++;

        doc.WriteHeading('Properties', headingLevel);         
        doc.WriteLine('| Property | Value |');
        doc.WriteLine('| --- | --- |');
        doc.WriteLine(`| Object Type | ${ALObjectType[alObject.Type]} |`);
        if (alObject.Subtype !== undefined) {
            doc.WriteLine(`| Object Subtype | ${ALCodeunitType[alObject.Subtype]} |`);
        }
        if (alObject.ExtensionType !== undefined) {
            doc.WriteLine(`| ${ALObjectExtensionType[alObject.ExtensionType]}ing | ${alObject.ExtensionObject} |`);
        }
        if (alObject.ID !== undefined) {
            doc.WriteLine(`| Object ID | ${alObject.ID} |`);
        }
        doc.WriteLine(`| Accessibility Level | ${ALAccessLevel[alObject.Access]} | `);
        doc.WriteLine();

        if (alObject.ObsoleteState !== ALObsoleteState.No) {
            doc.WriteLine(`>**Important**<br>${alObject.ObsoleteReason.replace(/'/mg,'')}`);
        }
        // write procedure / trigger documentation
        if (alObject.Procedures) {
            if (alObject.Procedures.filter(alProcedure => ((alProcedure.Type === ALProcedureType.Trigger) && (alProcedure.XmlDocumentation.Exists !== XMLDocumentationExistType.No))).length !== 0) {
                doc.WriteHeading('Triggers', headingLevel);
                if (!includeProcedure) {
                    doc.WriteLine();
                    doc.WriteLine('| Trigger | Description |');
                    doc.WriteLine('| --- | --- |');
                }
                let alProcedures = alObject.Procedures.filter(alProcedure => (alProcedure.Type === ALProcedureType.Trigger));
                for (const alProcedure of alProcedures) {
                    if (doc !== null) {
                        if (includeProcedure) {
                            await this.WriteProcedureDocumentation(doc, alObject, alProcedure, headingLevel);
                        } else {
                            let documentation = await alObject.GetDocumentationAsJsonObject(alProcedure);
                            doc.WriteLine(`| [${'`' + alProcedure.Name + '()`'}](${alObject.Name?.replace(/\s/mg, '_')}/${alProcedure.Name?.replace(/\s/mg, '_')}.md) | ${documentation.summary} |`);
                            await ALObjectDocumentationExport.ExportProcedure(alObject, alProcedure, output);
                        }
                    }
                };
                if (!includeProcedure) {
                    doc.WriteLine();
                }
            }
            if (alObject.Procedures.filter(alProcedure => ((alProcedure.Type === ALProcedureType.Procedure) && (alProcedure.XmlDocumentation.Exists !== XMLDocumentationExistType.No))).length !== 0) {
                doc.WriteHeading('Procedures', headingLevel);
                if (!includeProcedure) {
                    doc.WriteLine();
                    doc.WriteLine('| Procedure | Description |');
                    doc.WriteLine('| --- | --- |');
                }
                let alProcedures = alObject.Procedures.filter(alProcedure => (alProcedure.Type === ALProcedureType.Procedure));
                for (const alProcedure of alProcedures) {
                    if (doc !== null) {                  
                        if (includeProcedure) {
                            await this.WriteProcedureDocumentation(doc, alObject, alProcedure, headingLevel);
                        } else {                            
                            let documentation = await alObject.GetDocumentationAsJsonObject(alProcedure);
                            doc.WriteLine(`| [${'`' + alProcedure.Name + '()`'}](${alProcedure.Name?.replace(/\s/mg, '_')}.md) | ${documentation.summary} |`);
                            await ALObjectDocumentationExport.ExportProcedure(alObject, alProcedure, output);
                        }
                    }
                };
                if (!includeProcedure) {
                    doc.WriteLine();
                }
            }
        }

        // write example
        let documentation: any = ALDocCommentUtil.GetJsonFromXmlDocumentation(alObject.XmlDocumentation.Documentation);
        if (documentation.example) {            
            doc.WriteHeading('Example', headingLevel);
            doc.WriteLine(documentation.example.value);
            doc.WriteCode(documentation.example.code);
        }
    }

    /**
     * Export procedure documentation
     * @param alObject ALObject
     * @param alProcedure ALProcedure
     * @param output OutputChannel
     * @param headingLevel Initial heading level (optional)
     * @returns 
     */
    public static async ExportProcedure(alObject: ALObject, alProcedure: ALProcedure, output: OutputChannel, headingLevel: number = 0) {   
        this.Initialize(output);
        // do not export procedures w/o documentation
        if (alProcedure.XmlDocumentation.Exists === XMLDocumentationExistType.No) {
            this.WriteOutput(`Warning: No documentation found for ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name}()`);
            return;
        }
        let doc = new MarkdownWriter(`${this.GetDocumentationExportPath()}/${alObject.Name!.replace(/\s/mg, '_')}/${alProcedure.Name!.replace(/\s/mg, '_')}.md`);
        await this.WriteProcedureDocumentation(doc, alObject, alProcedure, headingLevel);
    }

    /**
     * Write procedure documentation to MarkdownWriter instance.
     * @param doc MarkdownWriter instance.
     * @param alProcedure ALProcedure
     * @param headingLevel Initial heading level (optional)
     */
    private static async WriteProcedureDocumentation(doc: MarkdownWriter, alObject: ALObject, alProcedure: ALProcedure, headingLevel: number = 0) {
        this.WriteOutput(`Processing ${ALProcedureType[alProcedure.Type]} ${alProcedure.Name}() . . . `);        
        
        headingLevel++;
        doc.WriteHeading('`' + alProcedure.Name + '()`', headingLevel);
        if (alProcedure.XmlDocumentation.Exists !== XMLDocumentationExistType.No) {
            let documentation: any = await alObject.GetDocumentationAsJsonObject(alProcedure);
            doc.WriteLine(documentation.summary);
            if (documentation.remarks) {
                doc.WriteLine(`> ${documentation.remarks}`);
            }
            doc.WriteLine();
        }

        headingLevel++;
        if (alProcedure.Type === ALProcedureType.Procedure) {
            doc.WriteLine();
            doc.WriteHeading('Syntax', headingLevel);
            doc.WriteCode(alProcedure.GetSyntax());
        }

        if (alProcedure.ObsoleteState !== ALObsoleteState.No) {                    
            doc.WriteLine();
            doc.WriteLine(`>**Important**<br>${alProcedure.ObsoleteReason.replace(/'/mg,'')}`);
            doc.WriteLine();
        }

        if (alProcedure.Parameters.length !== 0) {
            doc.WriteHeading('Parameters', headingLevel);
            alProcedure.Parameters.forEach(alParameter => {
                doc.WriteLine(`*${alParameter.Name}*<br>`);
                doc.WriteLine(`&emsp;Type: ${alParameter.Type} ${alParameter.Subtype !== undefined ? ` ${alParameter.Subtype}` : '' }<br>`);
                doc.WriteLine();
                if (alParameter.XmlDocumentation.Exists === XMLDocumentationExistType.Yes) {
                    let documentation: any = ALDocCommentUtil.GetJsonFromXmlDocumentation(alParameter.XmlDocumentation.Documentation);
                    doc.WriteLine(documentation.param.value);
                    doc.WriteLine();
                }
            });
            doc.WriteLine();
        }

        if (alProcedure.Type === ALProcedureType.Procedure) {
            if ((alProcedure.Return) && (alProcedure.Return.XmlDocumentation.Exists === XMLDocumentationExistType.Yes)) {
                doc.WriteHeading('Return', headingLevel);
                doc.WriteLine(`*${alProcedure.Return.Name !== "" ? alProcedure.Return.Name + ': ' : ''}${alProcedure.Return.Type}*<br>`);
                doc.WriteLine();
                let documentation: any = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.Return.XmlDocumentation.Documentation);
                if (documentation.returns) {
                    doc.WriteLine(documentation.returns);
                }
                doc.WriteLine();
            }

            let documentation: any = ALDocCommentUtil.GetJsonFromXmlDocumentation(alProcedure.XmlDocumentation.Documentation);
            if (documentation.example) {
                doc.WriteHeading('Example', headingLevel);
                doc.WriteLine(documentation.example.value);
                doc.WriteLine();
                doc.WriteCode(documentation.example.code);
                doc.WriteLine();
            }
        }
        headingLevel -= 2;
    }

    /**
     * Write message to output Channel
     * @param text message.
     * @param indent Specifies to indent the message.
     * @returns 
     */
    private static WriteOutput(text: string, indent: boolean = true) {
        if (this.output === null) {
            console.debug(`No output channel given. '${text}' could not be written.`);
            return;
        }

        this.output.appendLine(`${StringUtil.GetTimestamp()}${indent ? "   " : " "}${text}`);
    }

    /**
     * Helper function to iterate through enum values.
     * @param obj enum
     * @returns Array of enum values.
     */
    private static enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
        return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
    }
}