import { Disposable, window, workspace } from 'vscode';
import { ALObject } from './types/ALObject';
import { ALCheckDocumentation } from './util/ALCheckDocumentation';
import { ALSyntaxUtil } from './util/ALSyntaxUtil';

export class DoUpdateCache {
    private disposable: Disposable;

    constructor() {
        const subscriptions: Disposable[] = [];

        window.onDidChangeActiveTextEditor(editor => {
            if ((editor === undefined) || (editor === null)) {
                return;
            }
            
            ALSyntaxUtil.ClearALObjectFromCache(editor.document);
            let alObject: ALObject|null = ALSyntaxUtil.GetALObject(editor.document);
            if (alObject !== null) {                    
                ALCheckDocumentation.CheckDocumentationForALObject(alObject, editor.document);
            }
        }, this, subscriptions);
        
        workspace.onDidChangeTextDocument(event => {
            if (!event.document) {
                return;
            }
            
            ALSyntaxUtil.ClearALObjectFromCache(event.document);
            let alObject: ALObject|null = ALSyntaxUtil.GetALObject(event.document);
            if (alObject !== null) {                    
                ALCheckDocumentation.CheckDocumentationForALObject(alObject, event.document);
            }
        }, this, subscriptions);
        
        this.disposable = Disposable.from(...subscriptions);
    }    

    public dispose() {
        this.disposable.dispose();
    }
}