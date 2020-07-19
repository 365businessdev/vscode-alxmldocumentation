export type AlXmlDocConfig = {
	markdown_path: string;
	verbose: boolean;
	exportScope: string;
	enableDocComments: boolean;
	enableSummaryHover: boolean;
	enableSignatureHover: boolean;
	checkProcedureDocumentation: string;
};

export enum CodeType {
	Undefined = 0,
    Procedure = 1,
    Object = 2
};

export const ALXmlDocDiagnosticPrefix = "AL-XML-DOC";

export enum ALXmlDocDiagnosticCode {
	XmlDocumentationMissing = "DOC0001", // XML documentation is missing
	SummaryMissing = "DOC0002", // Summary is missing
	ParameterMissing = "DOC0010", // Parameter documentation is missing
	ParameterUnnecessary = "DOC0011", // Parameter documentation is unnecessary
	ReturnTypeMissing = "DOC0020"  // Return Type documentation is missing
}