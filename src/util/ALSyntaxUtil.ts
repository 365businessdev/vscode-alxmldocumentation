import { isNullOrUndefined } from "util";

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

    public static IsProcedure(line: string): boolean {
        if (line === null) {
            return false;
        }

        const isProcedure: boolean = line.trim().startsWith('procedure');
        if (isProcedure) {
            return true;
        }

        const isInternalProcedure: boolean = line.trim().startsWith('internal procedure');
        if (isInternalProcedure) {
            return true;
        }

        const isLocalProcedure: boolean = line.trim().startsWith('local procedure');
        if (isLocalProcedure) {
            return true;
        }

        const isTriggerProcedure: boolean = line.trim().startsWith('trigger');
        if (isTriggerProcedure) {
            return true;
        }

        return false;
    }

    public static IsBeginEnd(line: string): boolean {
        return (line.toLowerCase().match(/\bbegin|\bend/) !== null);
    }

    private static AnalyzeDefinition(regExResult: RegExpMatchArray | null) : RegExpMatchArray | null {
        if (isNullOrUndefined(regExResult)) {
            return null;
        }
        return regExResult;
    }

    public static AnalyzeProcedureDefinition(code: string): RegExpMatchArray | null {
        return this.AnalyzeDefinition(code.match(/(trigger|(?!local)procedure)\s+(?<ProcedureName>[A-Za-z0-9_]+)\b[^\(]*\((?<Params>.*)\)(?<ReturnType>((.*\:\s*)[A-Za-z0-9\s\""\.\[\]]+))?/));
    }

    public static AnalyzeObjectDefinition(code: string): RegExpMatchArray | null {
        if (code.startsWith('interface')) {
            return this.AnalyzeDefinition(code.match(/^(?<ObjectType>[A-Za-z]*)\b\s(?<ObjectName>"(?:[^"\\]|\\.)*"|([A-Za-z0-9]+))/));
        } else {
            return this.AnalyzeDefinition(code.match(/^(?<ObjectType>[A-Za-z]*)\b\s+(?<ObjectID>[0-9]+)\b\s(?<ObjectName>"(?:[^"\\]|\\.)*"|([A-Za-z0-9]+))/));
        }
    }
}