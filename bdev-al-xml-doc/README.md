# AL XML Documentation

The AL XML Documentation extension adds the feature to export XML documentation in AL source code files to markdown files.

## Features

### Export XML Documentation to Markdown for Directory
This features exports all valid XML documentation from codeunit objects with access modifier `Public` and Subtype `Normal` (empty). One markdown file per method will be created inside a directory which is named like the AL source file (e.g. `YourLibrary.Codeunit.al`)

## Setup
You have to define a `markdown_path` in workspace or general settings to define the directory where the markdown files have to be created in.
> **Please note** The directory will be deleted if already exist.

## Known Issues
 - None