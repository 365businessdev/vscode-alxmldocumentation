# Change Log

All notable changes to the "AL XML Documentation" extension will be documented in this file.

## [0.1.0] - 2020-04-29

- Initial release
- `AL XML DOC: Generate markdown documentation for directory` to export markdown documentation for all al source code files in the current directory into the target directory (`markdown_path`).

## [0.1.1] - 2020-04-30

- `Verbose` configuration parameter to display detailed information in output channel. Default is false.
- `AL XML DOC: Generate markdown documentation` to export markdown documentation from currently opened al source code file into the target directory (`markdown_path`).

## [0.1.2] - 2020-05-19

- Create `doc` directory in root folder if `markdown_path` is not defined.
- Auto-generate XML documentation comment after type "///".

## [0.1.3] - 2020-05-20

- Bugfix [#430](https://365businessdev.visualstudio.com/Visual%20Studio%20Code%20AL%20XML%20Documentation%20Extension/_workitems/edit/430) - `Command 'AL DOC: Generate markdown documentation' resulted in an error (Running the contributed command: 'bdev-al-xml-doc.exportMarkdown' failed.)`

## [0.2.0] - 2020-05-26

- Fixed `<param>` format from multiline to single line, according to [C# Programming Guide](https://docs.microsoft.com/de-de/dotnet/csharp/programming-guide/xmldoc/param).
- Support for `trigger` procedures (e.g. `OnRun` trigger).
- Support for object documentation (e.g. `codeunit 50000 MyCodeunit`).
- Fixed `var` in parameter name.
- Add XML documentation comments as snippets with placeholder variables.
- Automatically add `///` when hit enter inside or below a xml documentation comment.
- Allow direct usage of snippets in xml documentation comments.
- `index.md` creation with method list.
- Support for additional object types.
- Fixed multiline problem within xml documentation tags.

## [0.2.1] - 2020-06-15

- Add configuration parameter `exportScope` [#2](https://github.com/365businessdev/vscode-alxmldocumentation/issues/2).
- Fixed [#3](https://github.com/365businessdev/vscode-alxmldocumentation/issues/3) keywords in documentation.
- Moved Repository to GitHub.
- Added Bug Tracking information.

## [0.2.2] - 2020-06-16

- Removed procedure hover from prototype.

## [0.3.0] - 2020-07-02

- Allow underscore in Procedure Name [#1](https://github.com/365businessdev/vscode-alxmldocumentation/issues/1).
- Hover `<summary>` information from xml documentation on procedures.

## [0.3.1] - 2020-07-08

- Fixed Issue [#10](https://github.com/365businessdev/vscode-alxmldocumentation/issues/10) - Supporting documentation for `internal procedure`.
- Added configuration setting `enableDocComments` to disable documentation feature [#9](https://github.com/365businessdev/vscode-alxmldocumentation/issues/9).
- Fixed Issue [#8](https://github.com/365businessdev/vscode-alxmldocumentation/issues/8) - Documentation gets triggered inside procedures.

## [0.3.2] - 2020-07-11

- Fixed Issue [#11](https://github.com/365businessdev/vscode-alxmldocumentation/issues/11) - Allow special characters in object names.

## [0.4.0] - 2020-07-20

- Fixed Issue [#12](https://github.com/365businessdev/vscode-alxmldocumentation/issues/12) - Fixed Inside code detection (begin-end).
- Added `exportScope` description.
- Added diagnostic information and quick fix actions.

## [0.4.1] - 2020-07-20

- Fixed Issue [#14](https://github.com/365businessdev/vscode-alxmldocumentation/issues/14) - Fixed procedure overload support for diagnostics.
- Removed `trigger`-procedures from diagnostics.

## [0.4.2] - 2020-07-28

- Fixed Issue [#20](https://github.com/365businessdev/vscode-alxmldocumentation/issues/20) - Shows warning even when the function is documented.
- Fixed Issue [#18](https://github.com/365businessdev/vscode-alxmldocumentation/issues/18) - Documentation and var parameters.
- Added configuration `askEnableCheckProcedureDocumentation` [#19](https://github.com/365businessdev/vscode-alxmldocumentation/issues/19).
- Added configuration `procedureTypes` [#17](https://github.com/365businessdev/vscode-alxmldocumentation/issues/17) - Missing documentation non public functions
- Added check for unused parameter documentations in diagnostics.
- Fixed Issue [#21(1)](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21) - Support for quoted procedure names.
- Fixed Issue [#21(2)](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21) - Fixed keywords in documentation.
- Support placeholder `${workspaceFolder}` in `markdown_path` configuration [#18](https://github.com/365businessdev/vscode-alxmldocumentation/issues/21).
- Added object name to markdown `index.md`.

## [0.4.3] - 2020-07-29

- Fixed Issue [#23](https://github.com/365businessdev/vscode-alxmldocumentation/issues/23) - Fixed exception in markdown creation.

## [0.4.4] - 2020-07-30

- Upgrade to ALCodeCommentMarkdownCreator 1.3.5 - Issue [#24](https://github.com/365businessdev/vscode-alxmldocumentation/issues/24)

## [1.0.0] - 2020-11-23

- Redesign of the complete extension.
- Performance optimization for larger AL projects.
- Added inheritdoc – tag for documentation of inherit interface procedure documentations
- Added QuickFix for unnecessary parameter documentations
- New AL Source Code analysis
- Fixed Issue [#35](https://github.com/365businessdev/vscode-alxmldocumentation/issues/35)
- Fixed Issue [#33](https://github.com/365businessdev/vscode-alxmldocumentation/issues/33)
- Fixed Issue [#32](https://github.com/365businessdev/vscode-alxmldocumentation/issues/32)
- Fixed Issue [#31](https://github.com/365businessdev/vscode-alxmldocumentation/issues/31)
- Fixed Issue [#30](https://github.com/365businessdev/vscode-alxmldocumentation/issues/30)
- Fixed Issue [#29](https://github.com/365businessdev/vscode-alxmldocumentation/issues/29)
- Fixed Issue [#28](https://github.com/365businessdev/vscode-alxmldocumentation/issues/28)
- Fixed Issue [#27](https://github.com/365businessdev/vscode-alxmldocumentation/issues/27)
- Fixed Issue [#26](https://github.com/365businessdev/vscode-alxmldocumentation/issues/26)

## [1.0.1] - 2020-11-24

- Fixed Issue [#39](https://github.com/365businessdev/vscode-alxmldocumentation/issues/39)

## [1.0.2] - 2020-11-25

- Optimization: Do not check any kind of procedures in 'Test' codeunits if 'Test Procedures' is disabled in configuration.

## [1.0.3] - 2020-11-27

- Fixed Issue [#40](https://github.com/365businessdev/vscode-alxmldocumentation/issues/40) - Setting to suppress missing documentation messages for Access <> Public objects
- Fixed Issue [#28](https://github.com/365businessdev/vscode-alxmldocumentation/issues/28) - Option for no code-analyzer message for procedures in objects with Access=Internal
- Fixed configuration description for `CheckProcedureDocumentationForAccessLevel`

## [1.0.5] - 2021-01-25
- Fixed Issue [#42](https://github.com/365businessdev/vscode-alxmldocumentation/issues/42) - Underscore in Interface Names.
- Fixed Issue [#43](https://github.com/365businessdev/vscode-alxmldocumentation/issues/43) - "Inherit AL XML Documentation Comment" results in 'badly formed XML' if parameter type object name contains spaces (and therefore surrounded by quotes in the signature) 
- Fixed Issue [#27](https://github.com/365businessdev/vscode-alxmldocumentation/issues/27) - Inherit documentation for procedures implementing interface methods with underscore in object name
- Added configuration parameter `InitializeALObjectCacheOnStartUp` to skip initialization while start-up.

## [1.0.6] - 2021-02-15
- Fixed Issue [#45](https://github.com/365businessdev/vscode-alxmldocumentation/issues/45)