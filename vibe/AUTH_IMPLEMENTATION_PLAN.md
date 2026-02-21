# Authentication & Authorization Implementation Plan

**Date**: February 21, 2026  
**Status**: Planning Phase  
**Target Phase**: Phase 9 - User Accounts & Persistence

---

## Executive Summary

Add optional user authentication to QuizzQuizz while keeping anonymous play fully functional. Users can create accounts to:
- Save quiz history and statistics
- Create custom question banks
- Manage hosted sessions
- Track performance over time

**Key Principle**: Authentication is **opt-in**. Anonymous hosting and playing remain the default experience.

---

## Technology Decision: Better Auth vs. Alternatives

### Recommended: **Better Auth** 

**Pros**:
✅ TypeScript-first with excellent type safety  
✅ Built-in Prisma adapter (we're already using Prisma)  
✅ Framework-agnostic (works with Hono)  
✅ Multiple auth methods (email/password, OAuth, magic links)  
✅ Built-in CSRF protection, rate limiting  
✅ Session management with cookies or JWT  
✅ Active development and modern architecture  
✅ Plugin system for extensibility  

**Cons**:
⚠️ Relatively new library (less battle-tested than Passport.js)  
⚠️ Smaller community compared to Auth.js  

**Installation**: `npm install better-auth`

### Alternative 1: **Lucia** 

**Pros**:
✅ Ultra-lightweight and simple  
✅ Full control over auth flow  
✅ TypeScript-native  
✅ Excellent documentation  

**Cons**:
⚠️ More manual setup required  
⚠️ Need to implement OAuth providers yourself  
⚠️ Need to build email verification, password reset flows  

### Alternative 2: **Passport.js**

**Pros**:
✅ Battle-tested, widely used  
✅ Huge ecosystem of strategies  
✅ Well-documented  

**Cons**:
⚠️ Not TypeScript-first (needs @types)  
⚠️ Older architecture (callback-based)  
⚠️ More boilerplate code  

### Alternative 3: **Custom JWT Implementation**

**Pros**:
✅ Full control and simplicity  
✅ No external dependencies  
✅ Lightweight  

**Cons**:
⚠️ Security risks if not done correctly  
⚠️ Need to implement password reset, email verification, OAuth  
⚠️ More maintenance burden  

---

## Recommendation: **Better Auth** 

Given QuizzQuizz's TypeScript-first philosophy, Prisma stack, and the need for future OAuth support, **Better Auth** is the best fit.

---

## Architecture Overview

### Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Current State (MVP)                     │
├─────────────────────────────────────────────────────────────┤
│ • Host creates anonymous session → gets PIN + host token    │
│ • Players join with PIN → anonymous player record           │
│ • No persistence beyond session lifecycle                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Future State (Phase 9)                    │
├─────────────────────────────────────────────────────────────┤
│ Optional Authentication:                                     │
│ 1. Anonymous (default) - works exactly as now                │
│ 2. Authenticated - links session to user account             │
│                                                              │
│ Host Flow:                                                   │
│ • Guest: Create session → anonymous (current behavior)       │
│ • Logged in: Session saved to profile + history             │
│                                                              │
│ Player Flow:                                                 │
│ • Guest: Join with nickname (current behavior)               │
│ • Logged in: Stats saved to profile, history tracked        │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

```prisma
// New tables to add to schema.prisma

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  username      String?   @unique
  name          String?
  image         String?   // Avatar URL
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Relations
  accounts      Account[]
  sessions      UserSession[]
  hostedQuizzes HostedSession[]
  playerStats   PlayerStat[]
  savedQuizzes  SavedQuiz[]
  
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String  // "email" | "oauth"
  provider          String  // "credentials" | "google" | "github"
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model UserSession {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_sessions")
}

model VerificationToken {
  identifier String   // email
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}

// Update existing Session model
model Session {
  id                   String   @id
  pin                  String   @unique
  hostToken            String   @map("host_token")
  userId               String?  @map("user_id") // NEW: Link to authenticated user (nullable)
  // ... existing fields ...
  
  // Relations
  players       Player[]
  hostedSession HostedSession? // NEW: Link to saved quiz data
}

// New: Save quiz configurations
model SavedQuiz {
  id                String   @id @default(cuid())
  userId            String   @map("user_id")
  name              String
  description       String?
  questionBankId    String   @map("question_bank_id")
  questionIds       String?  @map("question_ids") // JSON array
  randomOrder       Boolean  @default(false)
  shuffleAnswers    Boolean  @default(true)
  automaticPace     Boolean  @default(false)
  autoQuestionTime  Boolean  @default(false)
  isPublic          Boolean  @default(false) @map("is_public")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("saved_quizzes")
}

// New: Historical quiz sessions
model HostedSession {
  id               String   @id // References Session.id
  userId           String   @map("user_id")
  sessionId        String   @unique @map("session_id")
  questionBankName String   @map("question_bank_name")
  totalPlayers     Int      @default(0) @map("total_players")
  completedAt      DateTime @map("completed_at")
  
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@map("hosted_sessions")
}

// New: Player statistics
model PlayerStat {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  sessionId       String   @map("session_id")
  nickname        String   // Nickname used in this session
  finalScore      Int      @map("final_score")
  finalRank       Int      @map("final_rank")
  correctAnswers  Int      @map("correct_answers")
  totalQuestions  Int      @map("total_questions")
  averageTime     Int      @map("average_time") // ms
  playedAt        DateTime @map("played_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, playedAt])
  @@map("player_stats")
}
```

---

## Implementation Phases

### Phase 9A: Authentication Infrastructure (3-4 hours)

**Goal**: Set up Better Auth and basic auth endpoints

**Tasks**:
1. **Install dependencies**
   ```bash
   cd packages/api-server
   npm install better-auth
   ```

2. **Update Prisma schema**
   - Add User, Account, UserSession, VerificationToken models
   - Add userId to Session model (nullable)
   - Create migration: `npx prisma migrate dev --name add_auth_tables`

3. **Configure Better Auth**
   - Create `packages/api-server/src/auth/config.ts`:
     ```typescript
     import { betterAuth } from "better-auth";
     import { prismaAdapter } from "better-auth/adapters/prisma";
     import { PrismaClient } from "@prisma/client";

     const prisma = new PrismaClient();

     export const auth = betterAuth({
       database: prismaAdapter(prisma, {
         provider: "sqlite",
       }),
       emailAndPassword: {
         enabled: true,
         requireEmailVerification: false, // Phase 9B
       },
       session: {
         expiresIn: 60 * 60 * 24 * 7, // 7 days
         updateAge: 60 * 60 * 24, // Update session every 24 hours
       },
       account: {
         accountLinking: {
           enabled: true,
         },
       },
     });
     ```

4. **Create auth routes**
   - Create `packages/api-server/src/routes/auth.ts`:
     ```typescript
     import { Hono } from 'hono';
     import { auth } from '../auth/config.js';
     
     const authRoutes = new Hono();
     
     // Better Auth handles all auth endpoints
     authRoutes.all('/*', async (c) => {
       return auth.handler(c.req.raw);
     });
     
     export default authRoutes;
     ```

5. **Mount auth routes in index.ts**
   ```typescript
   import authRoutes from './routes/auth.js';
   app.route('/api/auth', authRoutes);
   ```

6. **Create auth middleware**
   - Create `packages/api-server/src/middleware/auth.ts`:
     ```typescript
     import { Context } from 'hono';
     import { auth } from '../auth/config.js';
     
     export interface AuthContext {
       user: {
         id: string;
         email: string;
         username?: string;
       } | null;
     }
     
     export async function authMiddleware(c: Context) {
       const session = await auth.api.getSession({ headers: c.req.raw.headers });
       
       if (!session) {
         return c.set('user', null);
       }
       
       c.set('user', session.user);
     }
     
     export function requireAuth(c: Context, next: () => Promise<void>) {
       const user = c.get('user');
       if (!user) {
         return c.json({ error: 'Unauthorized' }, 401);
       }
       return next();
     }
     ```

7. **Update common types**
   - Add to `packages/common/src/types.ts`:
     ```typescript
     export const UserSchema = z.object({
       id: z.string(),
       email: z.string().email(),
       username: z.string().optional(),
       name: z.string().optional(),
       image: z.string().optional(),
     });
     
     export type User = z.infer<typeof UserSchema>;
     
     export const AuthResponseSchema = z.object({
       user: UserSchema,
       session: z.object({
         token: z.string(),
         expiresAt: z.number(),
       }),
     });
     
     export type AuthResponse = z.infer<typeof AuthResponseSchema>;
     ```

**Testing**:
- Manual testing with REST client
- Test endpoints:
  - `POST /api/auth/sign-up` - Create account
  - `POST /api/auth/sign-in` - Login
  - `POST /api/auth/sign-out` - Logout
  - `GET /api/auth/session` - Get current session

**Deliverable**: Basic email/password authentication working

---

### Phase 9B: User Profiles & Session Linking (2-3 hours)

**Goal**: Link quiz sessions to authenticated users

**Tasks**:
1. **Update session creation endpoint**
   - Modify `packages/api-server/src/routes/sessions.ts`:
     ```typescript
     // Add authMiddleware to session creation
     app.use('*', authMiddleware);
     
     app.post('/', async (c) => {
       const user = c.get('user'); // Will be null if not authenticated
       
       const session = await prisma.session.create({
         data: {
           // ... existing fields
           userId: user?.id, // Link to user if authenticated
         },
       });
       
       // ... rest of logic
     });
     ```

2. **Add user profile endpoint**
   - Create `packages/api-server/src/routes/users.ts`:
     ```typescript
     import { Hono } from 'hono';
     import { requireAuth } from '../middleware/auth.js';
     
     const userRoutes = new Hono();
     
     userRoutes.use('*', authMiddleware);
     
     // GET /api/users/me - Current user profile
     userRoutes.get('/me', requireAuth, async (c) => {
       const user = c.get('user');
       const profile = await prisma.user.findUnique({
         where: { id: user.id },
         include: {
           _count: {
             select: {
               hostedQuizzes: true,
               playerStats: true,
             },
           },
         },
       });
       
       return c.json({
         user: profile,
         stats: {
           totalHosted: profile._count.hostedQuizzes,
           totalPlayed: profile._count.playerStats,
         },
       });
     });
     
     // PATCH /api/users/me - Update profile
     userRoutes.patch('/me', requireAuth, async (c) => {
       const user = c.get('user');
       const body = await c.req.json();
       
       const updated = await prisma.user.update({
         where: { id: user.id },
         data: {
           username: body.username,
           name: body.name,
         },
       });
       
       return c.json({ user: updated });
     });
     
     export default userRoutes;
     ```

3. **Add session history tracking**
   - Create hook to save completed sessions:
     ```typescript
     // In packages/api-server/src/routes/game.ts
     // After session finishes (when all questions answered)
     
     if (session.userId) {
       await prisma.hostedSession.create({
         data: {
           id: ulid(),
           userId: session.userId,
           sessionId: session.id,
           questionBankName: questionBank.metadata.name,
           totalPlayers: players.length,
           completedAt: new Date(),
         },
       });
     }
     ```

4. **Mount user routes**
   ```typescript
   import userRoutes from './routes/users.js';
   app.route('/api/users', userRoutes);
   ```

**Testing**:
- Create authenticated session
- Verify userId is set
- Check /api/users/me shows profile
- Complete quiz and verify history saved

**Deliverable**: Authenticated users can see their hosted quiz history

---

### Phase 9C: Player Stats & History (2-3 hours)

**Goal**: Track player performance over time

**Tasks**:
1. **Login before joining**
   - Modify `packages/api-server/src/routes/players.ts`:
     ```typescript
     app.post('/join', authMiddleware, async (c) => {
       const user = c.get('user');
       const body = await c.req.json();
       
       // Create player as usual
       const player = await prisma.player.create({
         data: {
           id: ulid(),
           sessionId: body.sessionId,
           nickname: body.nickname,
           joinedAt: Date.now(),
         },
       });
       
       // If authenticated, track this player
       if (user) {
         // Store mapping: playerId -> userId (in-memory or Redis)
         playerUserMap.set(player.id, user.id);
       }
       
       return c.json({ player });
     });
     ```

2. **Save stats when quiz finishes**
   - Add to game finish logic:
     ```typescript
     // When session status → 'finished'
     for (const player of players) {
       const userId = playerUserMap.get(player.id);
       if (userId) {
         const answers = await prisma.playerAnswer.findMany({
           where: { playerId: player.id },
         });
         
         const correctCount = answers.filter(a => a.isCorrect).length;
         const avgTime = answers.reduce((sum, a) => {
           const q = getQuestion(a.questionId);
           return sum + (q.timeLimit || 20) * 1000 - a.submittedAt;
         }, 0) / answers.length;
         
         await prisma.playerStat.create({
           data: {
             id: ulid(),
             userId,
             sessionId: session.id,
             nickname: player.nickname,
             finalScore: player.score,
             finalRank: getRank(players, player.id),
             correctAnswers: correctCount,
             totalQuestions: answers.length,
             averageTime: Math.floor(avgTime),
             playedAt: new Date(),
           },
         });
       }
     }
     ```

3. **Add player history endpoint**
   - Add to `packages/api-server/src/routes/users.ts`:
     ```typescript
     // GET /api/users/me/history - Quiz history
     userRoutes.get('/me/history', requireAuth, async (c) => {
       const user = c.get('user');
       const stats = await prisma.playerStat.findMany({
         where: { userId: user.id },
         orderBy: { playedAt: 'desc' },
         take: 50,
       });
       
       return c.json({ history: stats });
     });
     
     // GET /api/users/me/stats - Aggregate statistics
     userRoutes.get('/me/stats', requireAuth, async (c) => {
       const user = c.get('user');
       
       const stats = await prisma.playerStat.aggregate({
         where: { userId: user.id },
         _avg: { finalScore: true, finalRank: true },
         _sum: { correctAnswers: true, totalQuestions: true },
         _count: true,
       });
       
       return c.json({
         totalQuizzes: stats._count,
         averageScore: Math.round(stats._avg.finalScore || 0),
         averageRank: Math.round(stats._avg.finalRank || 0),
         accuracy: stats._sum.totalQuestions 
           ? (stats._sum.correctAnswers / stats._sum.totalQuestions) * 100
           : 0,
       });
     });
     ```

**Testing**:
- Login → Join quiz → Complete quiz
- Verify stats saved to PlayerStat table
- Check /api/users/me/history shows quiz
- Verify /api/users/me/stats calculates correctly

**Deliverable**: Authenticated players can view their quiz history and stats

---

### Phase 9D: Saved Quizzes (2-3 hours)

**Goal**: Save custom quiz configurations

**Tasks**:
1. **Create saved quiz endpoints**
   - Create `packages/api-server/src/routes/saved-quizzes.ts`:
     ```typescript
     import { Hono } from 'hono';
     import { requireAuth } from '../middleware/auth.js';
     
     const savedQuizRoutes = new Hono();
     savedQuizRoutes.use('*', authMiddleware);
     
     // POST /api/saved-quizzes - Create
     savedQuizRoutes.post('/', requireAuth, async (c) => {
       const user = c.get('user');
       const body = await c.req.json();
       
       const quiz = await prisma.savedQuiz.create({
         data: {
           id: ulid(),
           userId: user.id,
           name: body.name,
           description: body.description,
           questionBankId: body.questionBankId,
           questionIds: body.questionIds,
           randomOrder: body.randomOrder,
           shuffleAnswers: body.shuffleAnswers,
           automaticPace: body.automaticPace,
           autoQuestionTime: body.autoQuestionTime,
           isPublic: body.isPublic || false,
         },
       });
       
       return c.json({ quiz });
     });
     
     // GET /api/saved-quizzes - List user's quizzes
     savedQuizRoutes.get('/', requireAuth, async (c) => {
       const user = c.get('user');
       const quizzes = await prisma.savedQuiz.findMany({
         where: { userId: user.id },
         orderBy: { updatedAt: 'desc' },
       });
       
       return c.json({ quizzes });
     });
     
     // GET /api/saved-quizzes/:id - Get specific quiz
     savedQuizRoutes.get('/:id', async (c) => {
       const quizId = c.req.param('id');
       const user = c.get('user');
       
       const quiz = await prisma.savedQuiz.findUnique({
         where: { id: quizId },
       });
       
       if (!quiz) {
         return c.json({ error: 'Quiz not found' }, 404);
       }
       
       // Check access: owner or public
       if (quiz.userId !== user?.id && !quiz.isPublic) {
         return c.json({ error: 'Access denied' }, 403);
       }
       
       return c.json({ quiz });
     });
     
     // PATCH /api/saved-quizzes/:id - Update
     savedQuizRoutes.patch('/:id', requireAuth, async (c) => {
       const quizId = c.req.param('id');
       const user = c.get('user');
       const body = await c.req.json();
       
       // Verify ownership
       const existing = await prisma.savedQuiz.findUnique({
         where: { id: quizId },
       });
       
       if (!existing || existing.userId !== user.id) {
         return c.json({ error: 'Not found' }, 404);
       }
       
       const updated = await prisma.savedQuiz.update({
         where: { id: quizId },
         data: body,
       });
       
       return c.json({ quiz: updated });
     });
     
     // DELETE /api/saved-quizzes/:id
     savedQuizRoutes.delete('/:id', requireAuth, async (c) => {
       const quizId = c.req.param('id');
       const user = c.get('user');
       
       const quiz = await prisma.savedQuiz.findUnique({
         where: { id: quizId },
       });
       
       if (!quiz || quiz.userId !== user.id) {
         return c.json({ error: 'Not found' }, 404);
       }
       
       await prisma.savedQuiz.delete({
         where: { id: quizId },
       });
       
       return c.json({ success: true });
     });
     
     export default savedQuizRoutes;
     ```

2. **Mount saved quiz routes**
   ```typescript
   import savedQuizRoutes from './routes/saved-quizzes.js';
   app.route('/api/saved-quizzes', savedQuizRoutes);
   ```

3. **Update common types**
   - Add to `packages/common/src/types.ts`:
     ```typescript
     export const SavedQuizSchema = z.object({
       id: z.string(),
       userId: z.string(),
       name: z.string(),
       description: z.string().optional(),
       questionBankId: z.string(),
       questionIds: z.array(z.string()).optional(),
       randomOrder: z.boolean(),
       shuffleAnswers: z.boolean(),
       automaticPace: z.boolean(),
       autoQuestionTime: z.boolean(),
       isPublic: z.boolean(),
       createdAt: z.string(),
       updatedAt: z.string(),
     });
     
     export type SavedQuiz = z.infer<typeof SavedQuizSchema>;
     ```

**Testing**:
- Create saved quiz
- List saved quizzes
- Update saved quiz
- Delete saved quiz
- Test public/private access

**Deliverable**: Users can save and manage quiz configurations

---

### Phase 9E: Frontend Integration (3-4 hours)

**Goal**: Add login/signup UI and authenticated features

**Tasks**:
1. **Install Better Auth client**
   ```bash
   cd packages/host-app
   npm install better-auth
   
   cd packages/player-app
   npm install better-auth
   ```

2. **Create auth client**
   - Create `packages/host-app/src/auth-client.ts`:
     ```typescript
     import { createAuthClient } from "better-auth/client";
     
     export const authClient = createAuthClient({
       baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
     });
     
     export async function getCurrentUser() {
       const session = await authClient.session();
       return session?.user || null;
     }
     
     export async function signUp(email: string, password: string, name: string) {
       return authClient.signUp.email({
         email,
         password,
         name,
       });
     }
     
     export async function signIn(email: string, password: string) {
       return authClient.signIn.email({
         email,
         password,
       });
     }
     
     export async function signOut() {
       return authClient.signOut();
     }
     ```

3. **Create auth UI components**
   - Create `packages/host-app/src/components/auth-modal.ts`:
     ```typescript
     import { authClient, signIn, signUp } from '../auth-client.js';
     
     export class AuthModal extends HTMLElement {
       private mode: 'signin' | 'signup' = 'signin';
       
       connectedCallback() {
         this.render();
       }
       
       private render() {
         this.innerHTML = `
           <div class="auth-modal-backdrop">
             <div class="auth-modal">
               <button class="close-btn" id="closeAuth">×</button>
               
               <div class="auth-tabs">
                 <button class="${this.mode === 'signin' ? 'active' : ''}" 
                         id="signinTab">Sign In</button>
                 <button class="${this.mode === 'signup' ? 'active' : ''}" 
                         id="signupTab">Sign Up</button>
               </div>
               
               <form id="authForm">
                 ${this.mode === 'signup' ? `
                   <input type="text" 
                          name="name" 
                          placeholder="Name" 
                          required />
                 ` : ''}
                 
                 <input type="email" 
                        name="email" 
                        placeholder="Email" 
                        required />
                 
                 <input type="password" 
                        name="password" 
                        placeholder="Password" 
                        required />
                 
                 <button type="submit">
                   ${this.mode === 'signin' ? 'Sign In' : 'Sign Up'}
                 </button>
               </form>
               
               <p class="auth-note">
                 ${this.mode === 'signin' 
                   ? 'No account required to host or play!' 
                   : 'Sign up to save your quiz history'}
               </p>
             </div>
           </div>
         `;
         
         this.attachEventListeners();
       }
       
       private attachEventListeners() {
         const form = this.querySelector('#authForm') as HTMLFormElement;
         const closeBtn = this.querySelector('#closeAuth');
         const signinTab = this.querySelector('#signinTab');
         const signupTab = this.querySelector('#signupTab');
         
         form?.addEventListener('submit', async (e) => {
           e.preventDefault();
           await this.handleSubmit(new FormData(form));
         });
         
         closeBtn?.addEventListener('click', () => this.close());
         signinTab?.addEventListener('click', () => this.switchMode('signin'));
         signupTab?.addEventListener('click', () => this.switchMode('signup'));
       }
       
       private async handleSubmit(formData: FormData) {
         const email = formData.get('email') as string;
         const password = formData.get('password') as string;
         const name = formData.get('name') as string;
         
         try {
           if (this.mode === 'signin') {
             await signIn(email, password);
           } else {
             await signUp(email, password, name);
           }
           
           this.dispatchEvent(new CustomEvent('auth-success'));
           this.close();
         } catch (error) {
           alert('Authentication failed: ' + error.message);
         }
       }
       
       private switchMode(mode: 'signin' | 'signup') {
         this.mode = mode;
         this.render();
       }
       
       private close() {
         this.remove();
       }
     }
     
     customElements.define('auth-modal', AuthModal);
     ```

4. **Add user menu component**
   - Create `packages/host-app/src/components/user-menu.ts`:
     ```typescript
     import { getCurrentUser, signOut } from '../auth-client.js';
     
     export class UserMenu extends HTMLElement {
       async connectedCallback() {
         const user = await getCurrentUser();
         
         if (!user) {
           this.innerHTML = `
             <button id="showAuth">Sign In</button>
           `;
           
           this.querySelector('#showAuth')?.addEventListener('click', () => {
             const modal = document.createElement('auth-modal');
             document.body.appendChild(modal);
           });
         } else {
           this.innerHTML = `
             <div class="user-menu">
               <span class="user-name">${user.name || user.email}</span>
               <div class="dropdown">
                 <button id="profileBtn">Profile</button>
                 <button id="historyBtn">History</button>
                 <button id="signOutBtn">Sign Out</button>
               </div>
             </div>
           `;
           
           this.attachAuthenticatedListeners();
         }
       }
       
       private attachAuthenticatedListeners() {
         this.querySelector('#profileBtn')?.addEventListener('click', () => {
           window.location.hash = '#/profile';
         });
         
         this.querySelector('#historyBtn')?.addEventListener('click', () => {
           window.location.hash = '#/history';
         });
         
         this.querySelector('#signOutBtn')?.addEventListener('click', async () => {
           await signOut();
           window.location.reload();
         });
       }
     }
     
     customElements.define('user-menu', UserMenu);
     ```

5. **Add to host app layout**
   - Update `packages/host-app/src/main.ts`:
     ```typescript
     // Add user menu to header
     const header = document.createElement('header');
     header.innerHTML = `
       <div class="header-content">
         <h1>QuizzQuizz Host</h1>
         <user-menu></user-menu>
       </div>
     `;
     document.body.prepend(header);
     ```

6. **Add profile route**
   - Create `packages/host-app/src/components/profile-screen.ts`:
     ```typescript
     export class ProfileScreen extends HTMLElement {
       async connectedCallback() {
         const response = await fetch('/api/users/me', {
           credentials: 'include',
         });
         
         const data = await response.json();
         
         this.innerHTML = `
           <div class="profile-screen">
             <h2>Profile</h2>
             
             <div class="profile-info">
               <p><strong>Email:</strong> ${data.user.email}</p>
               <p><strong>Username:</strong> ${data.user.username || 'Not set'}</p>
               <p><strong>Member since:</strong> ${new Date(data.user.createdAt).toLocaleDateString()}</p>
             </div>
             
             <div class="profile-stats">
               <h3>Statistics</h3>
               <p>Quizzes Hosted: ${data.stats.totalHosted}</p>
               <p>Quizzes Played: ${data.stats.totalPlayed}</p>
             </div>
             
             <button id="editProfile">Edit Profile</button>
           </div>
         `;
       }
     }
     
     customElements.define('profile-screen', ProfileScreen);
     ```

**Testing**:
- Sign up new account
- Sign in
- View profile
- Sign out
- Verify authenticated sessions work

**Deliverable**: Users can authenticate and see their profile/history in the UI

---

## Security Considerations

### 1. Password Security
- ✅ Better Auth uses bcrypt by default (10 rounds)
- ✅ Never store plain text passwords
- ✅ Enforce minimum password length (8 characters)

### 2. Session Security
- ✅ HTTP-only cookies (prevents XSS)
- ✅ SameSite=Lax (prevents CSRF)
- ✅ Secure flag in production (HTTPS only)
- ✅ Session expiry (7 days)

### 3. Rate Limiting
- ⚠️ TODO: Add rate limiting to auth endpoints
  - Max 5 login attempts per IP per 15 minutes
  - Max 3 signup attempts per IP per hour
  - Use `hono-rate-limiter` or Better Auth's built-in rate limiting

### 4. Email Verification
- Phase 9A: Optional (disabled initially)
- Phase 9F: Enable email verification
- Use Better Auth's built-in email verification

### 5. CORS
- Already configured in Hono
- Ensure `/api/auth/*` endpoints allow credentials

### 6. Input Validation
- Use Zod schemas for all user inputs
- Sanitize email and username inputs
- Validate password strength

---

## Migration Strategy

### Backward Compatibility

**Critical**: Existing anonymous sessions must continue to work!

**Strategy**:
1. All auth is **opt-in** - Session.userId is nullable
2. Anonymous sessions work exactly as before
3. API endpoints check `if (userId)` before saving history
4. Frontend shows auth as optional ("Sign in to save history")

### Data Migration

No migration needed for existing data since:
- Current sessions have no user association
- New auth tables are separate
- userId column in Session is nullable

### Deployment Steps

1. Deploy database migration (adds auth tables)
2. Deploy API server (adds auth endpoints)
3. Deploy frontend (adds auth UI)
4. Announce feature to users
5. Monitor adoption and errors

---

## Testing Strategy

### Unit Tests
- Auth middleware tests (valid/invalid sessions)
- Session linking tests
- Stats calculation tests
- Saved quiz CRUD tests

### Integration Tests
- Full auth flow (signup → login → create session)
- Anonymous session still works
- Authenticated session saves history
- Stats persist correctly

### E2E Tests
- Host: Login → Create quiz → View history
- Player: Login → Join quiz → View stats
- Anonymous: Works without login

---

## Questions for Clarification

1. **Email Verification**: Should we require email verification immediately or make it optional in Phase 9A?
   - **Recommendation**: Start optional, enable in Phase 9F

2. **OAuth Providers**: Which OAuth providers for Phase 9F+?
   - **Recommendation**: Google and GitHub (common for educators)

3. **Username**: Required or optional?
   - **Recommendation**: Optional (can use email as identifier)

4. **Profile Pictures**: Support avatars?
   - **Recommendation**: Phase 10+ (use Gravatar initially)

5. **Password Reset**: Email-based reset flow?
   - **Recommendation**: Phase 9F (requires email service setup)

6. **Remember Me**: Keep session alive longer?
   - **Recommendation**: 7 days default, 30 days with "remember me"

7. **2FA**: Two-factor authentication?
   - **Recommendation**: Phase 10+ (better-auth supports it)

8. **Social Profiles**: Link to X/Twitter, GitHub, etc.?
   - **Recommendation**: Phase 11+ (not essential)

---

## Timeline Estimate

**Total**: 12-16 hours

- Phase 9A: Auth Infrastructure - 3-4 hours
- Phase 9B: User Profiles & Session Linking - 2-3 hours
- Phase 9C: Player Stats & History - 2-3 hours
- Phase 9D: Saved Quizzes - 2-3 hours
- Phase 9E: Frontend Integration - 3-4 hours

**Contingency**: +20% for testing and bug fixes

---

## Dependencies

**NPM Packages**:
- `better-auth` (API server + frontends)
- `@prisma/client` (already installed)
- `ulid` or `cuid` for ID generation (already have custom ID utils)

**No Breaking Changes**:
- All existing functionality remains unchanged
- Anonymous sessions continue to work
- API is backward compatible

---

## Next Steps

1. **Review this plan** - Confirm approach with team
2. **Answer clarification questions** above
3. **Create Phase 9A branch** - Start with auth infrastructure
4. **Implement incrementally** - Test each phase before moving forward
5. **Document API changes** - Update API docs with auth endpoints

---

**Ready to implement?** Let me know which phase to start with or if you have questions!
