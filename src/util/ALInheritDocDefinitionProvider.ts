import { CancellationToken, DefinitionProvider, Location, LocationLink, Position, Range, TextDocument } from 'vscode';
import { InheritDocRegEx } from './ALRegEx';
import { ALObject } from '../types/ALObject';
import { ALSyntaxUtil } from './ALSyntaxUtil';
import { ALProcedure } from '../types/ALProcedure';
import { ALObjectType } from '../types/ALObjectType';

export class ALInheritDocDefinitionProvider implements DefinitionProvider {
    async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Location | Location[] | LocationLink[] | null | undefined> {
        if (document.lineAt(position.line).text.trim().startsWith('///')) {
            // if code reference (cref) is found.
            let codeRef: RegExpMatchArray | null = document.lineAt(position.line).text.match(InheritDocRegEx);
            if (codeRef === null) {
                return;
            }

            // split code reference.
            let codeRefObjectName: string = codeRef.groups!['CodeReference'].split('.')[0];
            let codeRefProcedureCode: string = codeRef.groups!['CodeReference'].split('.')[1];

            // get actual AL Object.
            let alObject: ALObject | null = ALSyntaxUtil.GetALObject(document);
            if ((alObject === null) || (alObject.Uri === undefined)) {
                return;
            }

            let objDefinition: Array<Location> | undefined = await ALSyntaxUtil.GetObjectDefinition(ALObjectType.Interface, codeRefObjectName);
            if (objDefinition === undefined) {
                return;
            }

            if (((document.lineAt(position.line).text.indexOf(codeRefObjectName)) <= position.character) && 
                ((document.lineAt(position.line).text.indexOf(codeRefObjectName) + codeRefObjectName.length) >= position.character)) {
                // build object return definition.
                let definition: Location | undefined = new Location(objDefinition[0].uri, new Range(
                    new Position(alObject.LineNo, 0),
                    new Position(alObject.LineNo, 0)));            

                return definition;
            }

            if ((document.lineAt(position.line).text.indexOf(codeRefObjectName)) < position.character) {
                let alProcedure: ALProcedure | undefined = alObject?.Procedures?.find((alProcedure) => (alProcedure.LineNo > position.line) && (alProcedure.Code === codeRefProcedureCode));
                if (alProcedure === undefined) {
                    return;
                }

                // build return definition.
                let definition: Location | undefined = new Location(objDefinition[0].uri, new Range(
                    new Position(alProcedure.Range!.start.line + 1, alProcedure.Range!.start.character),
                    new Position(alProcedure.Range!.end.line + 1, alProcedure.Range!.end.character)));            

                return definition;
            }
        }
    }
}