import { XMLDocumentationExistType } from './XMLDocumentationExistType';

export class XMLDocumentation {
    /**
     * Specifies that XML Documentation already exists in Source Code.
     * @type {XMLDocumentationExistType}
     */
    public Exists: XMLDocumentationExistType = XMLDocumentationExistType.No;
    
    /**
     * Contains the XML Documentation.
     * @type {string}
     */
    public Documentation: string = '';
}