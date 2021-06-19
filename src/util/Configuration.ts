import { workspace, window, WorkspaceConfiguration, WorkspaceFolder, Uri, DiagnosticSeverity } from 'vscode';
import { ALXmlDocConfigurationPrefix } from '../types';
import { ALAccessLevel } from '../types/ALAccessLevel';
import { ALProcedureSubtype } from '../types/ALProcedureSubtype';
import { ALProcedureType } from '../types/ALProcedureType';
import { FilesystemHelper } from './filesystem/FilesystemHelper';

export class Configuration {
    public static ExtensionName():string {
        return '365businessdevelopment.bdev-al-xml-doc';
    }

    public static GetWorkspaceRootFolder(): Uri | null {
        return workspace.workspaceFolders ? workspace.workspaceFolders[0].uri : null;
    }

    public static IncludeProcedureDocumentationInObjectDocumentationFile(): boolean {
        return (this.GetConfigurationValue('DocumentationExportSchema') === 'Project File + Object File');
    }
    
    public static OutputChannelName(): string {
        return 'AL XML Documentation';
    }

    public static PdfDocumentationExportCSS(): string {
        var cssFile = this.GetConfigurationValue('PdfDocumentationExportCSS');
        if (cssFile === '') {
            return '';
        }
        return FilesystemHelper.ReadFile(cssFile);
    }

    /**
     * Return Documentation Export Path, if specified
     * @returns Documentation Export Path
     */
    public static DocumentationExportPath(): string {
        var path = require('path');
        var documentationPath = this.GetConfigurationValue('DocumentationExportPath');
        let workspaceRoot : Uri | null = this.GetWorkspaceRootFolder();
        if (workspaceRoot === null) {
            window.showErrorMessage('Please setup \'DocumentationExportPath\' in workspace settings to define the export directory.');
            return '';
        }
        if (documentationPath === undefined || documentationPath === null || documentationPath === '') {
            // fallback scenario
            documentationPath = path.join(workspaceRoot.fsPath, 'doc');			
        } else {
            if ((documentationPath.includes('${workspaceFolder}')) && (workspace.workspaceFolders)) {
                documentationPath = documentationPath.replace('${workspaceFolder}', path.dirname(workspace.workspaceFolders[0].uri.toString()));
            } else {
                documentationPath = path.join(workspaceRoot.fsPath, documentationPath);
            }
        }
        return documentationPath;
    }

    /**
     * Get configuration value for InitializeALObjectCacheOnStartUp.
     */
    public static InitializeALObjectCacheOnStartUp(): boolean {
        return this.GetConfigurationValue('InitializeALObjectCacheOnStartUp');
    }

    /**
     * Opens confirmation dialog to ask for enabling the procedure documentation check.
     */
    public static AskEnableCheckDocumentationForWorkspace() {  
        if (!this.GetConfigurationValue('AskEnableCheckDocumentationForWorkspace')) {
            return;
        }

        if (this.ConfigurationHasChanged('CheckProcedureDocumentationInformationLevel')) {
            return; // do not ask again
        }

        window.showInformationMessage('Do you want to enable AL XML Documentation procedure check for this workspace?', ...['Yes', 'No']).then(answer => {
            if (answer === undefined) {
                return;
            }
            if (answer === 'Yes') {
                this.SetConfigurationValue('CheckProcedureDocumentationInformationLevel', 'Information');
            }
        });
    }

    /**
     * Test whether XML documentation is expected for test object.
     */
    public static IsDocumentationMandatoryForTest(): boolean {
        let mandatoryProcedureTypes: string[] = this.GetConfigurationValue('CheckProcedureDocumentationForType');
        if (mandatoryProcedureTypes.length === 0) {
            return false;
        }
        return (mandatoryProcedureTypes.find(mandatoryProcedureTypes => (mandatoryProcedureTypes === 'Test Procedures')) !== undefined);
    }
    
    /**
     * Test whether the given access level needs to be documented or not.
     * @param accessLevel ALAccessLevel
     * @returns True if documentation is expected. Otherwise false.
     */
    public static IsDocumentationMandatoryForAccessLevel(accessLevel: ALAccessLevel): boolean {
        let mandatoryAccessLevel = this.GetConfigurationValue('CheckProcedureDocumentationForAccessLevel');
        return (mandatoryAccessLevel.includes(ALAccessLevel[accessLevel]));
    }

    /**
     * Test whether the given AL Procedure properties need to be documented or not.
     * @param alProcedureType ALProcedureType.
     * @param alProcedureSubtype ALProcedureSubtype.
     * @param alAccessLevel ALAccessLevel.
     * @param fileUri Actual file url or undefined.
     */
    public static IsProcedureDocumentationMandatory(alObjectAccessLevel: ALAccessLevel, alProcedureType: ALProcedureType, alProcedureSubtype: ALProcedureSubtype, alAccessLevel: ALAccessLevel, fileUri: Uri | undefined = undefined): boolean {
        if (!this.ProcedureDocumentationCheckIsEnabled(fileUri)) {
            return false;
        }

        if ((!this.IsDocumentationMandatoryForAccessLevel(alAccessLevel)) || (!this.IsDocumentationMandatoryForAccessLevel(alObjectAccessLevel))) {
            return false;
        }

        let mandatoryProcedureTypes: string[] = this.GetConfigurationValue('CheckProcedureDocumentationForType');
        if (mandatoryProcedureTypes.length === 0) {
            return false;
        }
        let isMandatory: boolean = false;
        mandatoryProcedureTypes.forEach(mandatoryProcedureType => {
            switch (mandatoryProcedureType) {
                case 'Global Procedures':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.Normal) && (ALAccessLevel.Public === alAccessLevel)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Local Procedures':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.Normal) && (ALAccessLevel.Local === alAccessLevel)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Internal Procedures':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.Normal) && (ALAccessLevel.Internal === alAccessLevel)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Protected Procedures':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.Normal) && (ALAccessLevel.Protected === alAccessLevel)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Event Publisher':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.EventPublisher)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Event Subscriber':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.EventSubscriber)) {
                        isMandatory =  true;
                    }
                    break;
                case 'Trigger Procedures':
                    if (alProcedureType === ALProcedureType.Trigger) {
                        isMandatory =  true;
                    }
                    break;
                case 'Test Procedures':
                    if ((alProcedureType === ALProcedureType.Procedure) && (alProcedureSubtype === ALProcedureSubtype.Test)) {
                        isMandatory =  true;
                    }
                    break;
            }
        });
        return isMandatory;
    }

    /**
     * Returns whether the IntelliSense documentation behavior is activated or not.
     * @param fileUri Actual file url or undefined.
     */
    public static IntelliSenseDocumentationIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return (this.GetConfigurationValue('DocumentationBehavior', fileUri) === 'IntelliSense');
    }

    /**
     * Returns whether the direct documentation behavior is activated or not.
     * @param fileUri Actual file url or undefined.
     */
    public static DirectDocumentationIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return (this.GetConfigurationValue('DocumentationBehavior', fileUri) === 'Direct');
    }

    /**
     * Returns whether the XML Documentation Check for objects is enabled or not.
     * @param fileUri 
     */
    public static ObjectDocumentationCheckIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return (this.GetConfigurationValue('CheckObjectDocumentationInformationLevel', fileUri) !== 'Disabled');
    }

    /**
     * Returns DiagnosticSeverity for objects as configured.
     * @param fileUri 
     */
    public static GetObjectDocumentationCheckInformationLevel(fileUri: Uri | undefined = undefined): DiagnosticSeverity {
        switch (this.GetConfigurationValue('CheckObjectDocumentationInformationLevel', fileUri)) {
            case 'Information':
                return DiagnosticSeverity.Information;
            case 'Warning':
                return DiagnosticSeverity.Warning;
            case 'Error':
                return DiagnosticSeverity.Error;
        }

        return DiagnosticSeverity.Information;
    }

    /**
     * Returns whether the XML Documentation Check for procedures is enabled or not.
     * @param fileUri 
     */
    public static ProcedureDocumentationCheckIsEnabled(fileUri: Uri | undefined = undefined): boolean {
        return (this.GetConfigurationValue('CheckProcedureDocumentationInformationLevel', fileUri) !== 'Disabled');
    }

    /**
     * Returns DiagnosticSeverity for procedures as configured.
     * @param fileUri 
     */
    public static GetProcedureDocumentationCheckInformationLevel(fileUri: Uri | undefined = undefined): DiagnosticSeverity {
        switch (this.GetConfigurationValue('CheckProcedureDocumentationInformationLevel', fileUri)) {
            case 'Information':
                return DiagnosticSeverity.Information;
            case 'Warning':
                return DiagnosticSeverity.Warning;
            case 'Error':
                return DiagnosticSeverity.Error;
        }

        return DiagnosticSeverity.Information;
    }

    /**
     * Sets configuration value for given configuration parameter.
     * @param configParam Configuration Parameter to set value.
     * @param configValue New Configuration Value.
     */
    private static SetConfigurationValue(configParam: string, configValue: any) {
        let config: WorkspaceConfiguration | undefined = this.GetConfiguration();
        if (config === undefined) {
            workspace.getConfiguration(ALXmlDocConfigurationPrefix).update(configParam, configValue);
            return;
        }

        config.update(configParam, configValue);
    }

    /**
     * Get configuration value for given configuration parameter.
     * @param configParam Configuration Parameter to retrieve value from.
     * @param fileUri URI to actual file or undefined.
     */
    private static GetConfigurationValue(configParam: string, fileUri: Uri | undefined = undefined): any {
        let config: WorkspaceConfiguration | undefined = this.GetConfiguration(fileUri);
        if (config === undefined) {
            return;
        }
        return config.get(configParam);
    }

    /**
     * Get Configuration related for the actual file opened.
     * @param fileUri URI to actual file or undefined.
     */
    private static GetConfiguration(fileUri: Uri | undefined = undefined): WorkspaceConfiguration | undefined {
        let config: WorkspaceConfiguration | undefined;
        if (fileUri === undefined) {
            let activeDocument = (window.activeTextEditor !== undefined) ? window.activeTextEditor.document : undefined;
            let workspaceFolder: WorkspaceFolder | undefined = undefined;
            if (activeDocument !== undefined) {
                workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri);
                config = workspace.getConfiguration(ALXmlDocConfigurationPrefix, workspaceFolder);
            } else {
                config = workspace.getConfiguration(ALXmlDocConfigurationPrefix);
            }
        } else {
            let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
            config = workspace.getConfiguration(ALXmlDocConfigurationPrefix, workspaceFolder);
        }

        return config;
    }
    
    /**
     * Tests whether the configuration parameter has been changed from default values.
     * @param configParam Configuration Parameter.
     */
    private static ConfigurationHasChanged(configParam: string): boolean {
        let config = workspace.getConfiguration(ALXmlDocConfigurationPrefix).inspect(configParam);

        if (config?.workspaceFolderValue !== undefined) {
            return true;
        }
        if (config?.workspaceValue !== undefined) {
            return true;
        }        
        if (config?.globalValue !== undefined) {
            return true;
        }
        return false;
    }

    public dispose() {
    }
}