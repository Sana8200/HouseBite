# GitHub workflow for working on the project.

1. Make sure you are in the main branch: `git checkout main`
2. Update main before creating a new branch:
`git pull origin main`
3. Create your working branch: `git checkout -b branchName`
4. Stage your changes. `git add .` (or the file path you want to stage)
5. Commit your changes. `git commit -m "message"`
6. Before pushing, check if your branch is behind main.
`git fetch origin`
7. Rebase onto the latest main.
`git rebase origin/main`
8. If conflicts appear:
First, resolve the conflicts in the affected files.
After, conflicts solved.
`git add .`
Continue the rebase:
`git rebase --continue`
9. If you want to cancel the rebase:
`git rebase --abort`
10. If the rebase rewrote history, `git push --force-with-lease origin branchName`
11. If no history was rewritten: `git push -u origin branchName`
12. Once the branch is pushed. In the repository, create a Pull Request targeting main.
13. When merging the PR into main, use Squash and Merge.
