import { DiagnosticCollection, languages } from "vscode";
import { ALXmlDocDiagnosticPrefix } from "../types";

export class ALDiagnosticCollection {
    /**
     * Collection to store all gathered diagnostics.
     */
    public static Diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(ALXmlDocDiagnosticPrefix);
}