import { ALDocumentationExists } from './ALDocumentationExists';

export class ALDocumentation {
    /**
     * Specifies that AL Documentation already exists in Source Code.
     * @type {ALDocumentationExists}
     */
    public Exists: ALDocumentationExists = ALDocumentationExists.No;
    
    /**
     * Contains the AL Documentation.
     * @type {string}
     */
    public Documentation: string = '';
}