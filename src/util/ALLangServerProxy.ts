'use strict';

import { Location, extensions, workspace, Uri, Range, Extension } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguageClient, Position, CancellationTokenSource, CancellationToken } from 'vscode-languageclient';
import { ALObject } from '../types/ALObject';
import { ALSyntaxUtil } from './ALSyntaxUtil';

export class ALLangServerProxy {
    private langClient : LanguageClient | undefined;
    public extensionPath : string | undefined;
    public alEditorService: any;

    /**
     * ALLangServerProxy constructor.
     */
    constructor() {
        this.langClient = undefined;
        this.alEditorService = undefined;
    }

    /**
     * Get actual AL Language extension.
     */
    public GetALExtension() : Extension<any> | undefined {
        let storeVersion = extensions.getExtension('ms-dynamics-smb.al'); 
        let vsixVersion = extensions.getExtension('Microsoft.al');

        if ((storeVersion) && (vsixVersion)) {
            if (storeVersion.isActive) {
                return storeVersion;
            }
            if (vsixVersion.isActive) {
                return vsixVersion;
            }
            return storeVersion;
        }

        if (storeVersion) {
            return storeVersion;
        }

        return vsixVersion;
    }

    /**
     * Initialize Language Client
     * @returns False, if language client could not be loaded.
     */
    protected IsALLanguageClient() : boolean {
        if (!this.langClient) {
            let alExtension = this.GetALExtension();
            if ((!alExtension) || (!alExtension.isActive)) {
                return false;
            }

            if (alExtension.exports) {
                // get language client
                if (alExtension.exports.languageServerClient) {
                    if (alExtension.exports.languageServerClient.languageClient) {
                        this.langClient = alExtension.exports.languageServerClient.languageClient;
                    } else {
                        this.langClient = alExtension.exports.languageServerClient;
                    }
                 } else if (alExtension.exports.services) {
                    let services = alExtension.exports.services;
                    let langClientFound = false;
                    for (let i = 0; ((i < services.length) && (!langClientFound)); i++) {
                        if (services[i].languageServerClient) {                        
                            this.langClient = services[i].languageServerClient;
                            langClientFound = true;
                        }
                    }
                }

                // get editor service
                if (alExtension.exports.services) {
                    let alServices = alExtension.exports.services;
                    for (let i = 0; (i < alServices.length) && (!this.alEditorService); i++) {
                        if (alServices[i].setActiveWorkspace) {
                            this.alEditorService = alServices[i];
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * Retrieve first launch configuration to retrieve symbols from.
     */
    async GetFirstLaunchConfiguration() : Promise<any|undefined> {
        if ((!workspace.workspaceFolders) || (workspace.workspaceFolders.length === 0)) {
            return undefined;
        }

        let launchFilePath = path.join(workspace.workspaceFolders[0].uri.fsPath, '.vscode/launch.json');
        let config = workspace.getConfiguration('launch', Uri.file(launchFilePath));
        let allConfigList : any[] | undefined = config.get('configurations');
        if (!allConfigList) {
            return undefined;
        }

        let configList = allConfigList.filter(p => p.type === 'al');
        if ((!configList) || (configList.length === 0)) {
            return undefined;
        }

        if (configList.length > 0) {
            return configList[0];
        }

        return undefined;
    }

    /**
     * Perform go-to-definition call.
     * @param docUri URI of the source document.
     * @param pos Position to perform go-to-definition on.
     */
    async ALGoToDefinition(docUri: string, pos: Position) : Promise<Location | undefined> {
        let docPos : Location | undefined = undefined;
        try {
            this.IsALLanguageClient();
            if (!this.langClient) {
                return undefined;
            }

            let launchConfiguration = await this.GetFirstLaunchConfiguration();

            if (launchConfiguration) {
                let docPosTemp : any = await this.langClient.sendRequest<any>('al/gotodefinition', {
                    launchConfiguration : launchConfiguration,
                    textDocumentPositionParams : {
                        textDocument : {
                            uri : docUri.toString()
                        },
                        position : {
                            line : pos.line,
                            character : pos.character
                        }
                    },
                    context : undefined
                }, new CancellationTokenSource().token);

                if (docPosTemp) {
                    docPos = new Location(
                        Uri.parse(docPosTemp.uri),
                        new Range(
                            docPosTemp.range.start.line, 
                            docPosTemp.range.start.character,
                            docPosTemp.range.end.line, 
                            docPosTemp.range.end.character
                            )
                        );                    
                }
            }
        }   
        catch (ex) {
            console.debug(ex.message);
            return undefined;
        }    

        return docPos; 
    }

    /**
     * Retrieve AL Object from Language Server.
     * @param docUri Actual Document file path.
     * @param pos Actual Position to retrieve AL Object from.
     */
    async GetALObjectFromDefinition(docUri: string, pos: Position): Promise<{ ALObject: ALObject | null, Position: Position} | undefined> {
        try { 
            if ((!this.IsALLanguageClient()) || (!this.langClient)) {
                throw new Error(`Fatal error: Unable to contact language server.`);
            }     
        
            var __awaiter : any = (this && __awaiter) || function (thisArg: any, _arguments: any, P: PromiseConstructor, generator: { [x: string]: (arg0: any) => any; next: (arg0: any) => any; apply: any; }) {
                function adopt(value: unknown) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value: any) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                    function rejected(value: any) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
                    function step(result: any) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                });
            };

            // Execute AL Go to Definition
            let alDefinition: Location | undefined = await this.ALGoToDefinition(docUri, pos).then((result: any) => __awaiter(this, void 0, void 0, function* () {
                return Promise.resolve(result);
            }));

            if ((!alDefinition) || ((alDefinition.range.start.character === 0) && (alDefinition.range.end.character === 0))) {
                return undefined;
            }

            let alSourceCode: string = '';
            if (alDefinition.uri.scheme === 'al-preview') {      
                // For al-preview try get source code from language server.
                const request = { Uri: alDefinition.uri.toString() };                        
                alSourceCode = await this.langClient.sendRequest('al/previewDocument', request).then((result: any) => __awaiter(this, void 0, void 0, function* () {
                    return Promise.resolve(result.content);
                }));
            } else {
                // If file is available just read from filesystem.
                alSourceCode = fs.readFileSync(alDefinition.uri.fsPath, 'utf8');
            }

            let document = Object.assign({});
            document.getText = () => alSourceCode;
            document.fileName = (alDefinition.uri.scheme === 'al-preview') ? '__symbol__' : alDefinition.uri.fsPath;

            let result: { ALObject: ALObject | null, Position: Position} = {
                ALObject: ALSyntaxUtil.GetALObject(document),
                Position: alDefinition.range.end
            };

            return result;
        }
        catch(ex) 
        {
            console.error(`[GetALObjectFromDefinition] - ${ex} Please report this Please report this error at https://github.com/365businessdev/vscode-alxmldocumentation/issues`);
            return undefined;
        }

    }
}