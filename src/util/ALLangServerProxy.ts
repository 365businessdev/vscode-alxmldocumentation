'use strict';

import { Location, extensions, workspace, Uri, Range } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguageClient, Position, CancellationTokenSource, CancellationToken } from 'vscode-languageclient';

export class ALLangServerProxy {
    private langClient : LanguageClient | undefined;
    public extensionPath : string | undefined;
    public alEditorService: any;

    constructor() {
        this.langClient = undefined;
        this.alEditorService = undefined;
    }

    protected GetALExtension() : any {
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

        // This would be a way to handle multiple configuration.
        // To be honest it's really frustrating the the pop-up occurs every time to
        // select configuration.
        // We've decided to simple use the first configuration.
        //
        // if (configList.length === 1) {
        //     return configList[0];
        // }
        // //select configuration from drop down list
        // let configItems : string[] = [];
        // for (let i=0; i<configList.length; i++) {
        //     if (configList[i].name) {
        //         configItems.push(configList[i].name);
        //     }
        // }
        // let selectedItem = await window.showQuickPick(configItems, {
        //     placeHolder: 'Please select launch configuration'
        // });
        // if (selectedItem) {
        //     for (let i=0; i<configList.length; i++) {
        //         if (configList[i].name === selectedItem) {
        //             return configList[i];
        //         }
        //     }
        // }

        return undefined;
    }

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

    async GetALSourceCode(docUri: string, pos: Position): Promise<{ value: string; pos: Position; } | undefined> {  
        this.IsALLanguageClient();
        if (!this.langClient) {
            return undefined;
        }

        // get definition
        let definitionDocPos: Location | undefined = await this.ALGoToDefinition(docUri, pos);
        if ((!definitionDocPos) || ((definitionDocPos.range.start.character === 0) && (definitionDocPos.range.end.character === 0))) {
            return undefined;
        }
        
        try {
            var __awaiter : any = (this && __awaiter) || function (thisArg: any, _arguments: any, P: PromiseConstructor, generator: { [x: string]: (arg0: any) => any; next: (arg0: any) => any; apply: any; }) {
                function adopt(value: unknown) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value: any) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                    function rejected(value: any) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                    function step(result: any) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                });
            };

            var alSourceCode = { 
                "value": "", // just initialize
                "pos": definitionDocPos.range.end
            };
            // if scheme is 'al-preview' try get the source code from language server
            if (definitionDocPos.uri.scheme === 'al-preview') {            
                const request = { Uri: definitionDocPos.uri.toString() };                        
                alSourceCode.value = await this.langClient.sendRequest('al/previewDocument', request).then((result: any) => __awaiter(this, void 0, void 0, function* () {
                    return Promise.resolve(result.content);
                }));
            } else {
                alSourceCode.value = fs.readFileSync(definitionDocPos.uri.fsPath, 'utf8');
            }
            if (alSourceCode.value === "") {
                return undefined;
            } else {
                return alSourceCode;
            }
        } catch (ex) {
            console.debug(ex.message);
            return undefined;
        }
    }
}