import { SignatureHelpProvider, TextDocument, Position, CancellationToken, SignatureHelpContext } from "vscode";

export class ALSignatureHelpProvider implements SignatureHelpProvider {
    provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext): import("vscode").ProviderResult<import("vscode").SignatureHelp> {
        throw new Error("Method not implemented.");
    }    
}