/**
 * AL Object Types.
 */
export enum ALObjectType {
	Codeunit,
	Table,
    Page,
	Query,
	Report,
	XmlPort,
	Enum,
	TableExtension,
	PageExtension,
	EnumExtension,
	Interface,
	ControlAddIn
};

/**
 * AL Codeunit Types.
 */
export enum ALCodeunitType {
	Normal,
	Test,
	TestRunner,
	Install,
	Upgrade
}

/**
 * AL Access Level.
 */
export enum ALAccessLevel {
	Public,
	Internal,
	Local,
	Protected
}

/**
 * AL Obsolete State.
 */
export enum ALObsoleteState {
	No,
	Pending
}

/**
 * AL Procedure Types.
 */
export enum ALProcedureType {
	Procedure,
	Trigger
}

/**
 * AL Procedure Subtype.
 */
export enum ALProcedureSubtype {
	Normal,
	Test,
	EventPublisher,
	EventSubscriber
}

/**
 * General prefix used for diagnostics.
 */
export const ALXmlDocDiagnosticPrefix = "AL-XML-DOC";

/**
 * Diagnostics codes.
 */
export enum ALXmlDocDiagnosticCode {
	XmlDocumentationMissing = "DOC0001", // XML documentation is missing
	SummaryMissing = "DOC0002", // Summary is missing
	ParameterMissing = "DOC0010", // Parameter documentation is missing
	ParameterUnnecessary = "DOC0011", // Parameter documentation is unnecessary
	ReturnTypeMissing = "DOC0020"  // Return Type documentation is missing
}