# Date Gutter for IBMi

A Visual Studio Code extension that displays dates in the editor gutter, specifically designed for IBMi source files containing the source sequence and date information. This extension formats the download source dates in gutter information, while preserving the original text formatting. This extension also provides quick access to common operations through the Code Actions menu (light bulb) and the gutter menu.

## Features

- **Date Display**: Shows dates at the beginning of lines in YYMMDD format
- **Auto-hiding**: Automatically hides the date in the text content while displaying it in the gutter
- **Default Date**: Shows "000000" in the gutter for lines without a date
- **IBMi Support**: 
  - Built-in support for all common IBMi source types
  - Optimized for IBMi development workflow
- **Date Commands**: 
  - Insert current date at cursor position
  - Update existing date to current date
- **Smart Copy**:
  - Automatically excludes prefix numbers when copying (Ctrl+C)
  - Works with both single and multi-line selections
  - Preserves original text formatting
- **Code Actions** (Light Bulb Menu):
  - Appears when text is selected
  - **Copy without prefix**: Copy selected text excluding 12-digit prefix
  - **Delete Selected Lines**: Remove selected lines completely
    * Removes entire line content
    * Includes hidden 12-digit prefix
    * Cleans up gutter date display
  - Works with multi-line selections
- **Gutter Menu**:
  - Clickable gutter icons for quick line operations
  - Copy line content to clipboard
  - Delete current line

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install date-gutter-ibmi`
4. Press Enter

## Usage

1. Create or open a supported IBMi source file
2. Add a date at the beginning of a line in YYMMDD format (e.g., "230915")
3. The date will automatically be displayed in the gutter while being hidden in the text
4. Lines without a date will show "000000" in the gutter (in a lighter color)

### Commands

The extension provides the following commands that can be accessed through the Command Palette (Ctrl+Shift+P):

- `Date Gutter: Copy Selected Lines`: Copies selected text without the 12-digit prefix
- `Date Gutter: Delete Selected Lines`: Deletes selected lines completely (including prefix and gutter dates)
- `Date Gutter: Add Line Number Prefix`: Adds 12-digit prefix (6-digit line number + 6 zeros) to selected lines
- `Date Gutter: Set Date to Zero`: Sets the date part (positions 7-12) to "000000" for selected lines

### Code Actions Menu

The extension provides quick access to operations through the Code Actions menu (light bulb):

1. **Accessing the Menu**:
   - Select one or more lines in the editor
   - Look for the light bulb icon that appears
   - Click the light bulb to open the actions menu

2. **Available Operations**:
   - **Copy Selected Lines**: 
     * Copies selected text to clipboard
     * Automatically excludes 12-digit prefix
     * Preserves all other formatting
   - **Delete Selected Lines**:
     * Removes selected lines completely
     * Includes hidden 12-digit prefix
     * Removes gutter date display
     * Works with multiple selections
   - **Add Line Number Prefix**:
     * Adds 12-digit prefix to selected lines
     * First 6 digits are line number
     * Last 6 digits are zeros (000000)
     * Only adds to lines without existing prefix
   - **Set Date to Zero**:
     * Sets the date part (positions 7-12) to "000000"
     * Preserves the line number part (positions 1-6)
     * Only affects lines with 12-digit prefix
     * Works with multiple selections
   - **Remove 12-digit Prefix**:
     * Removes the 12-digit prefix from lines
     * Works in two modes:
       - Selection mode: Only processes selected lines
       - Full document mode: Processes all lines when no selection
     * Only affects lines with valid 12-digit prefix
     * Shows operation summary in status message

3. **Tips**:
   - Available for all supported IBMi file types
   - Works with single or multiple line selections
   - Operations are immediate and cannot be undone
   - Use with caution, especially the delete operation

### Gutter Menu

The extension provides quick access to common line operations through a gutter menu:

1. **Accessing the Menu**:
   - Look for the three-dot icon (⋮) in the gutter area (left margin) of each line
   - Click the icon to open the floating menu

2. **Available Operations**:
   - **Copy Line**: Copies the entire line content to clipboard
   - **Delete Line**: Removes the current line from the file

3. **Tips**:
   - The gutter menu is available for all supported IBMi file types
   - Operations are immediate and cannot be undone
   - Use with caution, especially the delete operation

## Extension Settings

This extension contributes the following settings:

* `dateGutter.enabled`: Enable/disable the date gutter extension (default: `true`)
* `dateGutter.enabledFileTypes`: Array of file extensions where date gutter should be enabled
* `dateGutter.rememberPrefixRemoval`: Controls whether to remember prefix removal history (default: `true`)
  - When enabled, prevents re-adding prefix to lines where it was previously removed
  - When disabled, allows prefix to be re-added regardless of removal history

Default supported IBMi source types:
- `.rpgle` (RPG ILE)
- `.sqlrpgle` (SQL RPG)
- `.clle` (CL)
- `.clp` (CL)
- `.dspf` (Display File)
- `.prtf` (Printer File)
- `.pf` (Physical File)
- `.lf` (Logical File)
- `.cmd` (Command)
- `.bnd` (Binding Directory)
- `.srvpgm` (Service Program)

Example settings.json to add custom file types:
```json
{
    "dateGutter.enabled": true,
    "dateGutter.enabledFileTypes": [
        ".rpgle",
        ".sqlrpgle",
        ".clle",
        ".clp",
        ".dspf",
        ".prtf",
        ".pf",
        ".lf",
        ".cmd",
        ".bnd",
        ".srvpgm"
    ]
}
```

## Examples

### Basic Usage
```
230915 Started working on the project
Added new features without date
230916 Fixed bugs
Released version 1.0
```

In the above example (in a supported IBMi source file):
- First line: Shows "230915" in the gutter, date is hidden in text
- Second line: Shows "000000" in the gutter (lighter color), no text is hidden
- Third line: Shows "230916" in the gutter, date is hidden in text
- Fourth line: Shows "000000" in the gutter (lighter color), no text is hidden

## Tips

1. Dates should be in YYMMDD format at the beginning of the line
2. Lines without dates will show "000000" in a lighter color
3. Use the provided commands to quickly insert or update dates
4. The extension is specifically designed for IBMi source files
5. Additional file types can be configured in VS Code settings if needed

## Requirements

- Visual Studio Code version 1.60.0 or higher

## Known Issues

None at this time.

## Release Notes

### 1.0.0
- Initial release
- Basic date gutter display
- Date insertion and update commands
- Built-in support for IBMi source types
- Default "000000" display for lines without dates
- Optimized for IBMi development workflow

---

## Development

### Building the Extension

For optimal performance, the extension should be bundled before publishing:

1. Install dependencies: `npm install`
2. Build the extension: `npm run compile`
3. Package for distribution: `npm run package`

This will create a bundled version in the `dist` folder.

### Performance Optimization

To improve performance:
- The extension is bundled using Webpack
- Unnecessary files are excluded via `.vscodeignore`
- Only production dependencies are included

### Contributing

Feel free to submit issues and enhancement requests on our GitHub repository.

### Running Tests

To run the tests:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`

For development:
- Use `npm run test:watch` to run tests in watch mode
- Use `npm run watch` for development mode with hot reload
- Tests are located in the `test` directory
- Test fixtures are in `test/fixtures`

## Publishing to Marketplace

### Prerequisites
- Microsoft account
- Azure DevOps organization
- Personal Access Token (PAT) with Marketplace > Manage scope

### Steps to Publish

1. **Prepare for Publishing**:
   ```bash
   npm run package  # Creates the VSIX package in dist/ folder
   ```

2. **Create Publisher** (if first time):
   - Go to https://marketplace.visualstudio.com/manage
   - Create new publisher (e.g., "your-publisher-name")
   - Verify publisher ownership

3. **Get Personal Access Token**:
   - Create PAT at https://dev.azure.com/_users/settings/tokens
   - Scope: Marketplace > Manage
   - Copy and save the token securely

4. **Login with vsce**:
   ```bash
   npx vsce login your-publisher-name
   ```
   (Enter your PAT when prompted)

5. **Publish the Extension**:
   - For new release:
     ```bash
     npx vsce publish -p $YOUR_PAT
     ```
   - For patch update:
     ```bash
     npx vsce publish patch -p $YOUR_PAT
     ```
   - For specific version:
     ```bash
     npx vsce publish 2.0.1 -p $YOUR_PAT
     ```

6. **Verify Publication**:
   - Check your extension page on Marketplace
   - It may take a few minutes to appear

### Publishing Options
- `major`: Major version bump
- `minor`: Minor version bump
- `patch`: Patch version bump
- Specific version: `npx vsce publish x.x.x`

## License

This extension is licensed under the [MIT License](LICENSE).

**Enjoy!**