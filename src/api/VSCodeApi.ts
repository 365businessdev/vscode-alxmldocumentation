import { TextEditor, Position, Selection } from "vscode";

export class VSCodeApi 
{
    public activeEditor: TextEditor;

    constructor(activeEditor: TextEditor) {
        this.activeEditor = activeEditor;
    }

    public ShiftPositionChar(position: Position, offset: number): Position {
        return this.GetPosition(position.line, position.character + offset);
    }

    public GetPosition(line: number, character: number): Position {
        return new Position(line, character);
    }

    public GetSelectionByPosition(anchor: Position, active: Position): Selection {
        return new Selection(anchor, active);
    }

    public GetLineCount(): number {
        return this.activeEditor.document.lineCount;
    }

    public ReadCurrentChar(): string {
        return this.ReadLineAtCurrent().charAt(this.GetActiveCharPosition());
    }

    public  ReadLineAtCurrent(): string {
        return this.ReadLine(this.GetActiveLine());
    }

    public ReadLine(line: number): string {
        return this.activeEditor.document.lineAt(line).text;
    }

    public GetActiveCharPosition(): number {
        return this.activeEditor.selection.active.character;
    }

    public GetActiveLine(): number {
        return this.GetActivePosition().line;
    }

    public GetActivePosition(): Position {
        return this.activeEditor.selection.active;
    }

    public GetPreviousLine(): number {
        return (this.GetActiveLine() - 1);
    }

    public GetNextLine(): number {
        return (this.GetActiveLine() + 1);
    }
}