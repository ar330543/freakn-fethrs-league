# Freakn Fethrs Production V1

Fixes included:
- Normalized Supabase tables instead of one JSON blob
- Score-level updates so multiple friends do not overwrite each other
- Realtime enabled for all main tables
- Accurate Played/Wins/Losses/PF/PA/Diff standings
- Multiple leagues and weeks
- Undo last score update

Deploy:
1. Replace GitHub files with this ZIP.
2. Run `sql/schema.sql` in Supabase SQL Editor.
   Warning: this resets the old app tables.
3. Commit to GitHub.
4. Vercel will auto-deploy.
