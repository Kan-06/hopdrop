# Contributing to HopDrop

Thanks for considering a contribution. This project is a compact prototype, so the goal is to keep changes focused, readable, and easy to review.

## Quick start
1. Create a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the app:
   ```bash
   python backend/app.py
   ```
4. Open http://127.0.0.1:5000

## Contribution guidelines
- Keep changes scoped to a clear purpose.
- Prefer small, meaningful commits with descriptive messages.
- Avoid large refactors unless required for reliability or security.
- Preserve the existing UI and flows.
- Document any behavior changes in README.md.

## Reporting issues
When opening an issue, include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or console logs (if relevant)

## Pull request checklist
- App starts and loads the UI.
- No console errors in the browser.
- New features include basic validation and error handling.
