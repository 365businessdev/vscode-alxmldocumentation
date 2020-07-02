export type AlXmlDocConfig = {
	markdown_path: string;
	verbose: boolean;
	exportScope: string;
	enableSummaryHover: boolean;
};

export enum CodeType {
	Undefined = 0,
    Procedure = 1,
    Object = 2
};