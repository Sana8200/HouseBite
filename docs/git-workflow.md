# Git Workflow

This is the git workflow we followed in the team. Everyone worked on their own branch, rebased it on `main`, and then opened a pull request that was merged with **Squash and Merge**.

## 1. Start from an up-to-date `main`

```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

## 2. Commit your work

```bash
git add <files>
git commit -m "Short description of the change"
```

## 3. Rebase onto the latest `main` before pushing

```bash
git fetch origin
git rebase origin/main
```

If there are conflicts, resolve them in the affected files, then:

```bash
git add <resolved files>
git rebase --continue
```

To give up and return to where you were: `git rebase --abort`.

## 4. Push

```bash
# First push of a new branch
git push -u origin <branch-name>

# After a rebase rewrote history on an already-pushed branch
git push --force-with-lease origin <branch-name>
```

## 5. Open a pull request

Open a PR to `main`. When it's ready, merge it with **Squash and Merge**, so each feature ends up as one commit on `main`.
