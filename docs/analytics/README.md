# QuizzQuizz Analytics

QuizzQuizz includes a built-in analytics dashboard that helps both **players** and **hosts** understand performance — who's improving, which questions trip people up, and how quizzes compare over time.

## Accessing Analytics

Go to `/analytics/` in your browser (e.g. `http://localhost:3003/analytics/`).  
You must be **signed in** to use analytics. If you are not signed in, you will be redirected to the sign-in page automatically.

![Analytics dashboard overview](screenshots/player-dashboard.png)

---

## Two Roles, Two Views

The left sidebar separates analytics into two sections:

| Section | Who it's for | What it shows |
|---------|-------------|---------------|
| **Player** | Anyone who plays quizzes | Personal performance history, topics, trends, speed, practice queue |
| **Host** | Quiz creators | Per-session breakdowns, question bank health, engagement, session comparison |

---

## Player Analytics

Players get **8 views** to track personal progress across all quizzes they have participated in:

| View | Description |
|------|-------------|
| [My Dashboard](player.md#my-dashboard) | Quick summary: games played, accuracy, streaks, recent sessions |
| [Session History](player.md#session-history) | Full list of every quiz you have played, with score and accuracy |
| [Session Detail](player.md#session-detail) | Deep dive into one quiz — question-by-question, per-topic accuracy |
| [Topics Overview](player.md#topics-overview) | Your accuracy broken down by topic across all quizzes |
| [Accuracy Trend](player.md#accuracy-trend) | How your accuracy has changed over time (line chart) |
| [Response Profile](player.md#response-profile) | Speed vs. accuracy scatter plot — are you fast & correct, or hesitant? |
| [Practice](player.md#practice) | AI-prioritised queue of questions you should revise next |
| [Global Comparison](player.md#global-comparison) | How you rank against all players on the same question banks |

→ [Full player guide](player.md)

---

## Host Analytics

Hosts get **4 views** tied to the quiz sessions and question banks they own:

| View | Description |
|------|-------------|
| [Session Report](host.md#session-report) | Per-question accuracy, player spread, response time percentiles for one session |
| [Bank Health](host.md#bank-health) | Which questions in a bank are too easy, too hard, or never answered |
| [Engagement](host.md#engagement) | Session frequency, participation trends over time |
| [Compare Sessions](host.md#compare-sessions) | Side-by-side comparison of two sessions from the same bank |

→ [Full host guide](host.md)

---

## Privacy & Data

- Analytics data is **personal** — you can only see your own player stats and the sessions you hosted.
- Stats are recorded automatically after each session finishes.
- Anonymous plays (players who join without signing in) are not tracked in personal analytics.

---

## Navigation Tips

- Use the **sidebar** on the left to switch between views.
- In the **Session History** and **Dashboard** tables, click any row to jump to the Session Detail.
- Host views that require a session or bank ID can be accessed by linking directly from the host app after a quiz finishes.
- Results are **cached for 30 seconds** — refresh the page if you just finished a session and the data hasn't appeared yet.
