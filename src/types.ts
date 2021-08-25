
/**
 * General prefix used for diagnostics.
 */
export const ALXmlDocDiagnosticPrefix = "AL-XML-DOC";

/**
 * General prefix for configuration parameters.
 */
export const ALXmlDocConfigurationPrefix = ALXmlDocDiagnosticPrefix.toLowerCase();

/**
 * Diagnostics codes.
 */
export enum ALXmlDocDiagnosticCode {
	XmlDocumentationMissing = "DOC0001", // XML documentation is missing
	SummaryMissing = "DOC0002", // Summary is missing
	ParameterMissing = "DOC0010", // Parameter documentation is missing
	ParameterUnnecessary = "DOC0011", // Parameter documentation is unnecessary
	ReturnTypeMissing = "DOC0020",  // Return Type documentation is missing
	ObjectXmlDocumentationMissing = "DOC0101" // XML documentation for object is missing
}

/**
 * Diagnostic messages.
 */
export enum ALXmlDocDiagnosticMessage {
	XmlDocumentationMissing = "XML documentation is missing",
	SummaryMissing = "Summary is missing.",
	ParameterMissing = "Parameter documentation is missing.",
	ParameterUnnecessary = "Parameter documentation is unnecessary.",
	ReturnTypeMissing = "Return Type documentation is missing."
}