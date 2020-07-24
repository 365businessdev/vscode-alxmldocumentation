import { isNullOrUndefined } from "util";
import { TextDocument, Range, Position } from "vscode";
import { Configuration } from "./Configuration";

export class ALSyntaxUtil {
    public static IsObject(line: string): boolean {
        if (line === null) {
            return false;
        }

        var objectDef = this.AnalyzeObjectDefinition(line);
        if (isNullOrUndefined(objectDef)) {
            return false;
        }        
        var groups = objectDef.groups;
        if (isNullOrUndefined(groups)) {
            return false;
        }
        if (isNullOrUndefined(groups['ObjectType'])) {
            return false;
        }

        return true;
    }

    public static IsProcedure(line: string, prevLine: string): boolean {
        if (line === null) {
            return false;
        }

        let procedureTypes = Configuration.ProcedureTypes();

        const isEventPublisher: boolean = (prevLine.trim().startsWith('[BusinessEvent')) || (prevLine.trim().startsWith('[IntegrationEvent')) || (prevLine.trim().startsWith('[InternalEvent')) ;
        if (isEventPublisher) {
            if ((procedureTypes.length === 0) || (procedureTypes.includes('Event Publisher'))) {
                return true;
            }
            return false;
        }

        const isEventSubscriber: boolean = prevLine.trim().startsWith('[EventSubscriber');
        if (isEventSubscriber) {
            if ((procedureTypes.length === 0) || (procedureTypes.includes('Event Subscriber'))) {
                return true;
            }
            return false;
        }
        
        const isTestProcedure: boolean = prevLine.trim().startsWith('[Test');
        if (isTestProcedure) {
            if ((procedureTypes.length === 0) || (procedureTypes.includes('Test Procedures'))) {
                return true;
            }
            return false;
        }

        const isProcedure: boolean = line.trim().startsWith('procedure');
        if ((isProcedure) && ((procedureTypes.length === 0) || (procedureTypes.includes('Global Procedures')))) {
            return true;
        }

        const isInternalProcedure: boolean = line.trim().startsWith('internal procedure');
        if ((isInternalProcedure) && ((procedureTypes.length === 0) || (procedureTypes.includes('Internal Procedures')))) {
            return true;
        }

        const isLocalProcedure: boolean = line.trim().startsWith('local procedure');
        if ((isLocalProcedure) && ((procedureTypes.length === 0) || (procedureTypes.includes('Local Procedures')))) {
            return true;
        }

        const isTriggerProcedure: boolean = line.trim().startsWith('trigger');
        if ((isTriggerProcedure) && ((procedureTypes.length === 0) || (procedureTypes.includes('Trigger Procedures')))) {
            return true;
        }

        return false;
    }

    public static IsBeginEnd(line: string): boolean {
        return (line.toLowerCase().match(/\bbegin\b|\bend\b/) !== null);
    }

    private static AnalyzeDefinition(regExResult: RegExpMatchArray | null) : RegExpMatchArray | null {
        if (isNullOrUndefined(regExResult)) {
            return null;
        }
        return regExResult;
    }

    public static GetALProcedureState(document: TextDocument, procedureLineNo: number = 0): { name: string; position: Range; definition: { [key: string]: string; }; documentation: string } | null {        
        let alCode = document.getText().split('\r\n');
        if (procedureLineNo === 0) {
            procedureLineNo = alCode.length - 1;
        }
        let alProcedureState = null;
        for (let lineNo = procedureLineNo; lineNo > 0; lineNo--) {
            let line = alCode[lineNo];
            switch (true)
            {
                case ALSyntaxUtil.IsProcedure(line, (lineNo > 0) ? alCode[lineNo - 1] : ""):
                    if (alProcedureState !== null ){
                        return alProcedureState;
                    }
    
                    let procedureDefinition = ALSyntaxUtil.AnalyzeProcedureDefinition(line)?.groups;
                    if ((procedureDefinition === undefined) || (procedureDefinition === null)) {
                        continue;
                    }
    
                    alProcedureState = {
                        name: procedureDefinition['ProcedureName'],
                        position: new Range(
                            new Position(lineNo, (line.length - line.trim().length)), 
                            new Position(lineNo, line.length)),
                        definition: procedureDefinition,
                        documentation: ""
                    };
                    break;
                case ALSyntaxUtil.IsBeginEnd(line):
                case ALSyntaxUtil.IsObject(line):
                    return alProcedureState;
                default:            
                    if ((alProcedureState !== null) && (line.trim().startsWith('///'))) {
                        alProcedureState.documentation = `${line.replace('///','').trim()}\r\n${alProcedureState.documentation}`;
                    }
                    break;
            }
        }

        return alProcedureState;
    }

    public static FindProcedures(code: string): any {
        let procedures: { procedureName : string, lineNo: number }[] = [];
        code.match(/(?<!\/\/\/\s*)(((?!local)procedure|(?!internal)procedure)\s+([A-Za-z0-9_]+)\b[^\(]*\)*.+)/g)?.forEach(match => {
            procedures.push({
                procedureName: match,
                lineNo: this.GetProcedureLineNo(match, code)
            });
        });

        return procedures;
    }

    private static GetProcedureLineNo(procedureName: string, code: string): number {        
        let codeLines = code.split("\r\n");
        let pos: number = -1;
        codeLines.filter((x) => {
            if (x.includes(procedureName)) {
                pos = codeLines.indexOf(x);
            }
        });

        return pos;
    }

    public static AnalyzeProcedureDefinition(code: string): RegExpMatchArray | null {
        return this.AnalyzeDefinition(code.match(/(trigger|(?!local)procedure)\s+(?<ProcedureName>[A-Za-z0-9_]+)\b[^\(]*\((?<Params>.*)\)(?<ReturnType>((.*\:\s*)[A-Za-z0-9\s\""\.\[\]]+))?/));
    }

    public static AnalyzeObjectDefinition(code: string): RegExpMatchArray | null {
        if ((code.startsWith('interface')) || (code.startsWith('controladdin'))) {
            return this.AnalyzeDefinition(code.match(/^(?<ObjectType>[A-Za-z]*)\b\s(?<ObjectName>"(?:[^"\\]|\\.)*"|([A-Za-z0-9]+))/));
        } else {
            return this.AnalyzeDefinition(code.match(/^(?<ObjectType>[A-Za-z]*)\b\s+(?<ObjectID>[0-9]+)\b\s(?<ObjectName>"(?:[^"\\]|\\.)*"|([A-Za-z0-9]+))/));
        }
    }
}