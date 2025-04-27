# Change Log

All notable changes to the "date-gutter-ibmi" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2023-09-15

### Added
- Initial release of Date Gutter for IBMi
- Display dates in YYMMDD format in the editor gutter
- Auto-hide dates in text content while showing in gutter
- Default "000000" display for lines without dates:
  - Shows in lighter color to distinguish from actual dates
  - No text hiding for lines without dates
  - Applies to all non-empty lines in supported files
- Command to insert current date at cursor position
- Command to update existing date to current date
- Configurable extension settings:
  - Enable/disable the extension globally
  - Configure supported file types through `enabledFileTypes` setting
- Built-in support for IBMi source types:
  - RPG ILE (.rpgle)
  - SQL RPG (.sqlrpgle)
  - CL (.clle, .clp)
  - Display File (.dspf)
  - Printer File (.prtf)
  - Physical File (.pf)
  - Logical File (.lf)
  - Command (.cmd)
  - Binding Directory (.bnd)
  - Service Program (.srvpgm)

### Changed
- Updated documentation with English descriptions
- Improved date formatting for better readability
- Added comprehensive file type configuration support
- Focused default support on IBMi development files
- Enhanced gutter display with default date indicators

## [Unreleased]

## [1.1.3] - 2023-10-20

### Added
- Smart copy functionality (Ctrl+C) that automatically excludes prefix numbers
- New command `dateGutter.copyWithoutPrefix` for filtered copying
- Key binding configuration for Ctrl+C/Command+C
- Debug logging for copy operations

### Changed
- Updated README with new feature documentation
- Improved copy behavior for multi-line selections
- Modified gutter decoration settings for better selection handling

## [Unreleased]

### Added
- Gutter floating menu for quick line operations
  - Copy line content to clipboard
  - Delete current line
- Clickable gutter icons (three dots) for menu access
- New commands for line operations:
  - `extension.gutterAction.copyLine`
  - `extension.gutterAction.deleteLine`

### Changed
- Updated gutter display to include action icons
- Improved context menu integration
- Enhanced documentation with new feature details