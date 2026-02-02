# TRCC Volunteer Management System

## Development Workflow & PR Submission Guide

Welcome to the TRCC Volunteer Management System codebase! This guide outlines how to get started, work on issues/tickets, and submit your code through pull requests (PRs).

---

### Initial Setup (One-Time)

1. **Clone the repository**

- `git clone https://github.com/uoftblueprint/trcc.git`
- `cd trcc`

2. **Set up environment variables**  
   Copy the shared `.env.local` configuration file provided by the PLs into the root directory (it should be found in `trcc/.env.local`). This file contains all necessary keys/URLs for Supabase and local development.

3. **Install dependencies**

- `npm install`

---

### Running the App Locally

1. **Start development server**

- Run the app at [http://localhost:3000](http://localhost:3000)
- use `npm run dev`

2. **Format your code**

- Automatically format all files according to project rules
- use `npm run format`

3. **Run lint checks**

- Check code style and look for any lint issues
- use `npm run lint`

4. **Run automated tests**

- Run all available tests. Test cases will be developed throughout the sprints.
- use `npm run test`

### Database integration tests (Supabase)

This repo supports **database integration tests** that run against a **local Supabase** instance.

- **Start local Supabase and apply migrations**: `npm run supabase:setup` (run once; new devs get all migrations automatically)
- **Run DB tests only**: `npm run test:db`
- **Notes**: see `tests/db/README.md` for the team testing standard and required env vars.

---

## Working on a Ticket

0. **Select a ticket from the Kanban board**
   To find the kanban board: go to the Github repo click on Projects > TRCC Project.

- Choose a ticket from the "Ready" column
- Move the ticket to the "In progress" column and assign yourself to the ticket

1. **Update your local main branch**  
   Make sure your local main branch is up to date before branching from main:

- git checkout main
- git pull origin main

2. **Create a new branch**  
   Name your branch concisely and descriptively related to the issue/ticket:  
   Examples: `backend/filter-by-role-api`, `frontend/login-page`, `test/filter-general`

- `git checkout -b branch-name-here`

3. **Implement your changes**

- Follow the project structure (e.g. write API functions inside the `src/lib/api/` folder)
- Ensure tests pass using `npm run test` (if there are tests created that are related to your function/feature)

4. **Format and lint your code before committing**  
   Run the following:

- `npm run format`
- `npm run lint`

5. **Commit your changes**  
   Use a meaningful commit message that briefly summarizes the work done:

- git add <files_changed>
- git commit -m "Add create volunteer API function"

6. **Push your branch to remote**  
   `git push origin branch-name-here`

7. **Create a Pull Request (PR)**

- Go to the GitHub repo and open a PR from your branch into main
- Use a clear title and description that references the ticket
- Include screenshots of passed tests (if any test cases) or of the feature working (e.g. working page or logs)
- In the kanban board: move your ticket from "In progress" to "In review". Also, click on the ticket, and in the right column, click on Development and connect your branch/PR to the ticket.

---

## Useful Commands Summary

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `npm install`            | Install project dependencies            |
| `npm run dev`            | Run development server (localhost:3000) |
| `npm run format`         | Format code automatically               |
| `npm run lint`           | Check for linting errors                |
| `npm run test`           | Run unit and integration tests          |
| `git checkout main`      | Switch to main branch                   |
| `git pull origin main`   | Pull latest main branch changes         |
| `git checkout -b <name>` | Create and switch to new branch         |
| `git add .`              | Stage all changed files                 |
| `git commit -m "msg"`    | Commit staged changes with a message    |
| `git push origin <name>` | Push branch to remote repository        |
