# Freakn Fethrs Production V12 - Weekly Cost Management

Adds:
- Cost management inside every week
- Cost per birdie
- Number of birdies
- Court booking cost
- Player count override
- Overall cost
- Cost per person

Formula:
((Cost per birdie × Number of birdies) + Court booking cost) ÷ Number of players

SQL:
Run `sql/schema.sql` once in Supabase. This is non-destructive and only adds the `week_costs` table.

Deploy:
1. Replace GitHub files with this ZIP contents.
2. Run `sql/schema.sql` in Supabase.
3. Commit to GitHub.
4. Confirm live app shows: Build: V12 Weekly Cost Management.
