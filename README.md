# Freakn Fethrs Production V9 - Overall League Standings

Adds:
- Overall standings under each league
- Calculates all completed scores across all weeks in the selected league
- Stores the calculated leaderboard as a snapshot
- Undo previous leaderboard snapshot
- Clear leaderboard
- Recalculate anytime

SQL:
Run `sql/schema.sql` in Supabase. This is non-destructive and only adds overall leaderboard tables.

Deploy:
1. Replace GitHub files with this ZIP contents.
2. Run the SQL.
3. Commit to GitHub.
4. Confirm live app shows: Build: V9 Overall League Standings
