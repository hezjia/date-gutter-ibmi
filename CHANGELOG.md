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
- No unreleased changes at this time