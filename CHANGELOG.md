# Changelog

## 0.3.0 - 2026-09-20

Reader 0.3.0 removes the unsafe server-generated audio path, updates the Gemini integration, and makes build checks enforceable.

### Changed

- Renamed the product and package to Reader.
- Updated the Gemini integration to the current Google GenAI plugin and `gemini-flash-latest` model alias.
- Replaced the invalid static web manifest with a typed Next.js manifest.
- Aligned ESLint with Next.js 15 and restored lint and type validation during production builds.
- Documented the supported input as text-based PDF files.

### Removed

- Removed persistent MP3 generation, its public audio uploads, and the unmaintained `node-gtts` dependency. Browser speech synthesis remains available.
- Removed generated-audio state, storage rules, and the duplicate Firebase Admin setup used by that endpoint.

### Security

- Updated Next.js to 15.5.25 to include its available security fixes.
- Added Firebase ID-token verification and an input-size limit to the word-repair endpoint.
- Reduced the production audit on 2026-09-20 to 0 critical, 14 high, 55 moderate, and 2 low findings. The remaining findings are in transitive dependencies without compatible direct-package fixes.
