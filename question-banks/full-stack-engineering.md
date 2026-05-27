# Question Bank: Full-Stack Engineering

## Metadata
- **Topics**: frontend:react:hooks, frontend:react:state-management, frontend:css:layout, frontend:css:animations, frontend:performance:bundling, frontend:performance:rendering, backend:nodejs:event-loop, backend:nodejs:streams, backend:api:rest, backend:api:graphql, backend:auth:jwt, backend:auth:oauth2, database:relational:indexing, database:relational:normalization, database:nosql:document, database:nosql:wide-column, database:caching:strategies, database:caching:redis, devops:containers:docker, devops:containers:kubernetes, devops:ci-cd:pipelines, devops:ci-cd:testing, devops:monitoring:metrics, devops:monitoring:logging, security:web:xss, security:web:csrf, security:crypto:symmetric, security:crypto:asymmetric, security:iam:roles, security:iam:permissions
- **Default Time Limit**: 30s
- **Description**: Comprehensive full-stack engineering questions covering frontend, backend, database, DevOps, and security with a deep 3-level topic hierarchy.

---

## Questions

### FSE001
**Difficulty**: easy
**Topics**: frontend:react:hooks
**Tags**: react, useState

Which React hook adds local state to a functional component?

- [x] useState
- [ ] useEffect
- [ ] useContext
- [ ] useReducer

---

### FSE002
**Difficulty**: medium
**Topics**: frontend:react:hooks
**Tags**: react, useEffect, side-effects

How do you run a useEffect callback only once when a component mounts?

- [x] Pass an empty dependency array [] as the second argument
- [ ] Call useEffect with no second argument
- [ ] Pass null as the second argument
- [ ] Use useLayoutEffect instead

---

### FSE003
**Difficulty**: hard
**Topics**: frontend:react:hooks, frontend:react:state-management
**Tags**: react, closure, stale-state

A button handler calls `setCount(count + 1)` three times in a loop. The counter increments by 1 instead of 3. What is the root cause?

- [x] The closure captures the same stale value of count for all three calls; use the functional form setCount(prev => prev + 1) instead
- [ ] React batches setState calls and applies only the last one
- [ ] useEffect must be used to increment state inside loops
- [ ] The component re-renders between each call and resets count

---

### FSE004
**Difficulty**: medium
**Topics**: frontend:react:state-management
**Tags**: react, context, prop-drilling

Which problem does React Context primarily solve?

- [x] Prop drilling — passing data through many component layers without each component needing to explicitly forward it
- [ ] Asynchronous state updates causing unexpected re-renders
- [ ] Preventing unnecessary re-renders in large component trees
- [ ] Managing side effects such as API calls and subscriptions

---

### FSE005
**Difficulty**: hard
**Topics**: frontend:react:state-management
**Tags**: react, useReducer, complex-state

Which scenario best justifies useReducer over useState?

- [x] State has multiple inter-dependent sub-values and next state depends on the previous state in complex, branching ways
- [ ] The component needs to fetch data from an API on mount
- [ ] A boolean flag needs to toggle between true and false
- [ ] Two sibling components need to share a value

---

### FSE006
**Difficulty**: easy
**Topics**: frontend:css:layout
**Tags**: css, flexbox

Which CSS property enables the Flexbox layout model on a container?

- [x] display: flex
- [ ] flex: 1
- [ ] layout: flex
- [ ] position: flex

---

### FSE007
**Difficulty**: medium
**Topics**: frontend:css:layout
**Tags**: css, grid, template-columns

Which declaration creates a 3-column CSS Grid where each column takes equal space?

- [x] grid-template-columns: repeat(3, 1fr)
- [ ] grid-columns: 3
- [ ] columns: repeat(3, auto)
- [ ] display: grid-3

---

### FSE008
**Difficulty**: medium
**Topics**: frontend:css:layout, frontend:css:animations
**Tags**: css, transform, compositing

Which CSS property is most efficient for animating element position without triggering layout recalculation?

- [x] transform: translate()
- [ ] top and left with position: absolute
- [ ] margin adjustments
- [ ] padding adjustments

---

### FSE009
**Difficulty**: hard
**Topics**: frontend:css:animations
**Tags**: css, keyframes, will-change, compositor

An animation using CSS keyframes causes jank on low-end devices. Which approach most effectively improves performance?

- [x] Animate only transform and opacity, and add will-change: transform to promote the element to its own compositor layer
- [ ] Use requestAnimationFrame in JavaScript to control the animation
- [ ] Set animation-duration: 0s on slow devices
- [ ] Replace keyframes with CSS transitions on hover

---

### FSE010
**Difficulty**: easy
**Topics**: frontend:css:animations
**Tags**: css, transition, keyframes

What is the key difference between a CSS transition and a CSS animation?

- [x] Transitions require a state-change trigger and animate between two states; animations use @keyframes and can run automatically and repeatedly
- [ ] Transitions are always more performant than animations
- [ ] Animations require JavaScript; transitions are pure CSS
- [ ] There is no practical difference — they are interchangeable

---

### FSE011
**Difficulty**: medium
**Topics**: frontend:performance:bundling
**Tags**: webpack, code-splitting, dynamic-import

Which technique reduces initial bundle size by loading code only when needed?

- [x] Code splitting with dynamic import()
- [ ] Tree shaking unused exports
- [ ] Minification and compression
- [ ] Source map generation

---

### FSE012
**Difficulty**: hard
**Topics**: frontend:performance:bundling
**Tags**: webpack, tree-shaking, esm, commonjs

Why does tree shaking work best with ES Modules rather than CommonJS?

- [x] ESM import/export declarations are static, letting bundlers determine unused exports at build time; CommonJS require() is dynamic and evaluated at runtime
- [ ] ESM files are smaller due to stricter syntax rules
- [ ] CommonJS always includes every export in the bundle
- [ ] Bundlers cannot parse CommonJS modules

---

### FSE013
**Difficulty**: medium
**Topics**: frontend:performance:rendering
**Tags**: browser, reflow, layout-thrashing

A scroll handler reads offsetTop then sets style.top in the same frame, causing visible stuttering. What is the cause?

- [x] Forced synchronous layout — reading a layout property forces the browser to flush pending style changes before the read, causing repeated reflows within the same frame
- [ ] The scroll event fires too frequently and must be throttled
- [ ] offsetTop is deprecated and causes a fallback computation
- [ ] style.top triggers a full page repaint on every assignment

---

### FSE014
**Difficulty**: easy
**Topics**: frontend:performance:rendering
**Tags**: react, virtual-dom, reconciliation

What is the primary purpose of React's virtual DOM?

- [x] To minimise direct DOM mutations by computing the diff in memory and applying only the necessary changes to the real DOM
- [ ] To allow React components to run in a Web Worker
- [ ] To provide a way to access DOM nodes directly via refs
- [ ] To cache API responses and reduce network requests

---

### FSE015
**Difficulty**: hard
**Topics**: frontend:performance:rendering, frontend:react:hooks
**Tags**: react, memo, useCallback, referential-equality

A child component wrapped in React.memo still re-renders on every parent render despite no prop changes. What is the most likely cause?

- [x] A callback passed as a prop is defined inline in the parent, creating a new function reference on every render, which fails React.memo's shallow equality check; wrap it with useCallback
- [ ] React.memo does not work with function components that receive function props
- [ ] The child must also memoize its own state with useMemo
- [ ] React ignores memo when the parent has any hooks

---

### FSE016
**Difficulty**: easy
**Topics**: backend:nodejs:event-loop
**Tags**: nodejs, async, non-blocking

What makes Node.js suitable for I/O-bound workloads despite being single-threaded?

- [x] The event loop delegates I/O operations to the OS or libuv thread pool and continues processing other events while waiting for completion
- [ ] Node.js spawns a new OS thread for every I/O operation
- [ ] Node.js buffers all I/O in memory and processes it in batches
- [ ] Node.js uses multiple CPU cores via shared memory

---

### FSE017
**Difficulty**: medium
**Topics**: backend:nodejs:event-loop
**Tags**: nodejs, microtask, macrotask, promises

In Node.js, which queue is processed before the next event loop iteration begins?

- [x] The microtask queue (Promise callbacks, queueMicrotask) — it is fully drained before any macrotask (setTimeout, setImmediate, I/O) runs
- [ ] The macrotask queue, because it was registered first
- [ ] setImmediate callbacks, because they run before Promises
- [ ] I/O callbacks, because they have the highest priority

---

### FSE018
**Difficulty**: hard
**Topics**: backend:nodejs:event-loop
**Tags**: nodejs, cpu-bound, worker-threads

A Node.js API handler performs heavy JSON parsing and users report high latency on all endpoints. What is the diagnosis and fix?

- [x] CPU-bound work blocks the event loop; offload the parsing to a worker_threads Worker so the main thread stays responsive
- [ ] Increase --max-old-space-size to give Node.js more memory for parsing
- [ ] Use async/await to parse JSON asynchronously without blocking
- [ ] Switch to a streaming JSON parser to avoid the issue entirely

---

### FSE019
**Difficulty**: medium
**Topics**: backend:nodejs:streams
**Tags**: nodejs, backpressure, writable

What is backpressure in the context of Node.js streams?

- [x] The mechanism by which a writable stream signals to a readable stream to pause when its internal buffer is full, preventing unbounded memory use
- [ ] The error thrown when a stream is closed before all data is written
- [ ] The process of compressing data before writing it to a stream
- [ ] The latency introduced by network round trips in TCP streams

---

### FSE020
**Difficulty**: hard
**Topics**: backend:nodejs:streams
**Tags**: nodejs, pipeline, memory-leak

A file processing pipeline reads a large CSV, transforms rows, and writes to a database. Memory grows without bound. What is the root cause?

- [x] The readable side produces data faster than the writable side consumes it; backpressure is not honoured, causing the internal buffer to grow unboundedly — use stream.pipeline() to handle backpressure automatically
- [ ] The CSV parser loads the entire file into memory before emitting any events
- [ ] Node.js streams do not support backpressure for file reads
- [ ] The transform stream is not calling this.push() correctly

---

### FSE021
**Difficulty**: easy
**Topics**: backend:api:rest
**Tags**: rest, http, 201

Which HTTP status code should a POST endpoint return when it successfully creates a new resource?

- [x] 201 Created
- [ ] 200 OK
- [ ] 204 No Content
- [ ] 202 Accepted

---

### FSE022
**Difficulty**: medium
**Topics**: backend:api:rest
**Tags**: rest, idempotency, http-methods

Which HTTP methods are idempotent according to the HTTP specification?

- [x] GET, PUT, DELETE, HEAD, OPTIONS
- [ ] GET, POST, PUT
- [ ] Only GET and HEAD
- [ ] POST, PUT, PATCH

---

### FSE023
**Difficulty**: hard
**Topics**: backend:api:rest, backend:auth:jwt
**Tags**: rest, api-versioning, content-negotiation

Which API versioning strategy avoids polluting the URL and lets clients negotiate versions via HTTP headers?

- [x] Content negotiation via the Accept header (e.g. Accept: application/vnd.api.v2+json)
- [ ] URL path versioning (/api/v2/resource)
- [ ] Query parameter versioning (?version=2)
- [ ] Hostname-based versioning (v2.api.example.com)

---

### FSE024
**Difficulty**: medium
**Topics**: backend:api:graphql
**Tags**: graphql, n-plus-one, dataloader

What is the N+1 problem in GraphQL, and how is it solved?

- [x] A resolver makes one query per list item (N queries for N items); solved by DataLoader which batches and deduplicates requests into a single query per field per batch
- [ ] GraphQL executes each query N times for cache redundancy
- [ ] N+1 refers to maximum nesting depth; solved with depth limits
- [ ] A mutation is accidentally called N+1 times; solved with idempotency keys

---

### FSE025
**Difficulty**: hard
**Topics**: backend:api:graphql
**Tags**: graphql, subscriptions, pubsub, scaling

GraphQL subscription resolvers start blocking the event loop under high load. What is the most scalable fix?

- [x] Move delivery to a pub/sub broker (e.g. Redis Pub/Sub or Kafka); subscription resolvers subscribe to channels rather than doing work inline
- [ ] Increase the number of subscriptions per connection to amortise overhead
- [ ] Replace subscriptions with long-polling REST endpoints
- [ ] Set a lower subscription TTL so resolvers complete faster

---

### FSE026
**Difficulty**: medium
**Topics**: backend:auth:jwt
**Tags**: jwt, claims, expiry

Which JWT claim specifies the token expiration time?

- [x] exp — a NumericDate (Unix timestamp) after which the token must not be accepted
- [ ] iat — issued-at timestamp
- [ ] nbf — not-before timestamp
- [ ] sub — subject identifier

---

### FSE027
**Difficulty**: hard
**Topics**: backend:auth:jwt
**Tags**: jwt, hs256, rs256, asymmetric, security

A microservices system uses HS256 JWTs. A service only needs to validate tokens, not issue them. What is the security risk and the correct fix?

- [x] HS256 uses a shared secret; any service that can verify can also forge tokens — switch to RS256 so the auth service keeps the private key and other services only hold the public key
- [ ] HS256 tokens cannot be validated across services; use HS512 instead
- [ ] Add a token introspection endpoint so services verify via HTTP
- [ ] Rotate the shared secret monthly to minimise exposure

---

### FSE028
**Difficulty**: easy
**Topics**: backend:auth:oauth2
**Tags**: oauth2, pkce, spa

Which OAuth 2.0 grant is recommended for SPAs where a client secret cannot be kept confidential?

- [x] Authorization Code with PKCE (Proof Key for Code Exchange)
- [ ] Implicit grant
- [ ] Client credentials grant
- [ ] Resource owner password credentials grant

---

### FSE029
**Difficulty**: medium
**Topics**: backend:auth:oauth2
**Tags**: oauth2, refresh-token, access-token

What is the purpose of an OAuth 2.0 refresh token?

- [x] To obtain a new access token after the current one expires without requiring the user to re-authenticate
- [ ] To verify the user's identity at the resource server
- [ ] To immediately revoke the current access token
- [ ] To extend the expiry of an existing access token in place

---

### FSE030
**Difficulty**: easy
**Topics**: database:relational:indexing
**Tags**: sql, b-tree, query-performance

Which index type is most commonly used for equality and range queries on a single column?

- [x] B-tree index
- [ ] Hash index
- [ ] Full-text index
- [ ] GiST index

---

### FSE031
**Difficulty**: medium
**Topics**: database:relational:indexing
**Tags**: sql, composite-index, column-order

A query filters on (status, created_at). A composite index exists on (created_at, status). Will the index be used efficiently?

- [x] No — the leading column of the index (created_at) does not match the most selective leading predicate; the query planner may skip the index or use a slower partial scan
- [ ] Yes — the query planner reorders predicates to match the index automatically
- [ ] Yes — composite indexes work for any permutation of their columns
- [ ] No — composite indexes cannot span multiple WHERE clauses

---

### FSE032
**Difficulty**: hard
**Topics**: database:relational:indexing, database:relational:normalization
**Tags**: sql, covering-index, heap-fetch

When does a covering index provide the most benefit?

- [x] When all columns referenced by the query (SELECT, WHERE, ORDER BY) are in the index, eliminating heap fetches — most valuable when the table is large and random I/O to the main table is the bottleneck
- [ ] A unique index on the primary key always covers all queries
- [ ] A partial index on the most selective WHERE column always covers the query
- [ ] Covering indexes are only useful for queries with no WHERE clause

---

### FSE033
**Difficulty**: medium
**Topics**: database:relational:normalization
**Tags**: sql, 3nf, transitive-dependency

What anomaly does Third Normal Form (3NF) eliminate that Second Normal Form (2NF) does not?

- [x] Transitive dependencies — a non-key attribute depending on another non-key attribute rather than directly on the primary key
- [ ] Partial dependencies — a non-key attribute depending on only part of a composite primary key
- [ ] Multi-valued dependencies causing duplicate rows
- [ ] Repeating groups of columns in a single table

---

### FSE034
**Difficulty**: hard
**Topics**: database:relational:normalization
**Tags**: sql, denormalization, olap, tradeoffs

A reporting database runs complex aggregations over billions of rows too slowly. A DBA proposes denormalising tables. What is the correct tradeoff?

- [x] Denormalisation sacrifices write integrity and introduces data redundancy in exchange for faster reads; acceptable in OLAP systems where reads dominate and data is loaded in bulk
- [ ] Denormalisation always improves both read and write performance
- [ ] Denormalisation only affects query complexity, not storage
- [ ] 3NF must be maintained regardless of use case

---

### FSE035
**Difficulty**: easy
**Topics**: database:nosql:document
**Tags**: mongodb, document-model, embedding

What is the primary advantage of embedding related data in a single document rather than using references?

- [x] A single read retrieves all related data without joins, reducing latency and round-trip count
- [ ] Embedded documents are automatically indexed on all fields
- [ ] Document size is unlimited, so embedding is always preferable
- [ ] Embedded data is automatically encrypted at rest

---

### FSE036
**Difficulty**: medium
**Topics**: database:nosql:document
**Tags**: mongodb, aggregation, lookup

Which MongoDB aggregation stage is equivalent to a SQL JOIN?

- [x] $lookup — performs a left outer join between the current collection and another in the same database
- [ ] $merge — writes pipeline output back into a collection
- [ ] $group — groups documents by a key, similar to GROUP BY
- [ ] $unwind — deconstructs an array field, similar to UNNEST

---

### FSE037
**Difficulty**: hard
**Topics**: database:nosql:document, database:nosql:wide-column
**Tags**: nosql, eventual-consistency, cap-theorem

A document database configured for eventual consistency serves a stale read immediately after a write. Is this a bug?

- [x] No — eventual consistency guarantees convergence over time, not immediate read-after-write consistency; replicas may lag; this is expected and by design
- [ ] Yes — the write failed silently and must be retried
- [ ] No — eventual consistency means writes are asynchronously acknowledged after the read
- [ ] Yes — the read was served from an application-layer cache that must be invalidated

---

### FSE038
**Difficulty**: medium
**Topics**: database:nosql:wide-column
**Tags**: cassandra, partition-key, data-modeling

In Apache Cassandra, what does the partition key determine?

- [x] Which node(s) store the data for that partition, by hashing the key to a position on the consistent hash ring
- [ ] How rows within a partition are sorted
- [ ] A unique identifier for a single row
- [ ] The secondary index used for non-primary-key filtering

---

### FSE039
**Difficulty**: hard
**Topics**: database:nosql:wide-column
**Tags**: cassandra, tombstones, compaction, performance

Millions of tombstones accumulate in a Cassandra table, causing read latency to climb. What is the root cause and remedy?

- [x] Tombstones accumulate when rows are deleted before compaction removes them; reads must scan them to find live data — redesign to avoid frequent deletes (use TTL instead of explicit deletes) and tune gc_grace_seconds and compaction strategy
- [ ] Tombstones are caused by failed writes that require manual resolution
- [ ] Increase the replication factor to distribute tombstone scanning
- [ ] Run TRUNCATE to immediately remove all tombstones

---

### FSE040
**Difficulty**: easy
**Topics**: database:caching:strategies
**Tags**: caching, cache-aside, lazy-loading

In the cache-aside (lazy-loading) pattern, what happens on a cache miss?

- [x] The application fetches data from the database, writes it to the cache, then returns it to the caller
- [ ] The cache automatically fetches missing data from the database
- [ ] The request fails and the caller must retry
- [ ] The application fetches the data but intentionally skips populating the cache

---

### FSE041
**Difficulty**: medium
**Topics**: database:caching:strategies
**Tags**: caching, write-through, consistency

Which caching write strategy keeps the cache and database always in sync by writing to both on every update?

- [x] Write-through — every write updates both the cache and the backing store synchronously before acknowledging success
- [ ] Write-behind — writes go to the cache immediately and are asynchronously flushed to the store
- [ ] Cache-aside — the application manages cache and database writes independently
- [ ] Read-through — reads populate the cache; writes bypass it

---

### FSE042
**Difficulty**: hard
**Topics**: database:caching:strategies, database:caching:redis
**Tags**: caching, stampede, thundering-herd, mutex

A popular cache key expires and dozens of requests simultaneously find a cache miss, all hitting the database at once. What is this called and how is it mitigated?

- [x] Cache stampede (thundering herd); mitigated by probabilistic early expiry, mutex locks (e.g. Redis SETNX), or serving the stale value while one request rebuilds the cache
- [ ] Cache pollution — too many items evict useful entries; fixed by LRU eviction
- [ ] Write coalescing — already handled by write-through caching
- [ ] Connection pool exhaustion — increase the database connection pool size

---

### FSE043
**Difficulty**: medium
**Topics**: database:caching:redis
**Tags**: redis, sorted-set, leaderboard

Which Redis data structure is best for a real-time leaderboard supporting rank updates and top-N range queries?

- [x] Sorted Set (ZSET) — stores members with scores; O(log N) updates and O(log N + M) range queries
- [ ] List — efficient for push/pop but not for rank queries
- [ ] Hash — stores field-value pairs with no built-in ordering
- [ ] Bitmap — suitable for boolean per-user flags, not scoring

---

### FSE044
**Difficulty**: hard
**Topics**: database:caching:redis
**Tags**: redis, aof, persistence, durability

A Redis instance acts as both cache and session store. After a restart, sessions are lost despite AOF being enabled. What is the most likely cause?

- [x] AOF fsync frequency is too low (appendfsync everysec or no); a crash before a sync loses recent writes — use appendfsync always or combine AOF + RDB for session durability
- [ ] AOF only persists hash and string types; sessions require RDB snapshots
- [ ] Redis evicts all keys under memory pressure regardless of persistence settings
- [ ] The maxmemory-policy evicts all keys on restart

---

### FSE045
**Difficulty**: easy
**Topics**: devops:containers:docker
**Tags**: docker, layer-cache, dockerfile

Why should frequently changing instructions (e.g. COPY source code) be placed near the end of a Dockerfile?

- [x] Docker caches each layer; placing stable instructions (e.g. installing dependencies) first maximises cache reuse and avoids re-running expensive steps when only code changes
- [ ] Later instructions run on faster hardware in Docker BuildKit
- [ ] Application code must be the last layer to be accessible at runtime
- [ ] Earlier layers are read-only and cannot hold application code

---

### FSE046
**Difficulty**: medium
**Topics**: devops:containers:docker
**Tags**: docker, multi-stage, image-size

What is the purpose of a multi-stage Dockerfile build?

- [x] To use one or more build stages (e.g. a full SDK image) and copy only the final artifacts into a minimal runtime image, reducing production image size and attack surface
- [ ] To build the same image for multiple CPU architectures in parallel
- [ ] To run multiple services inside a single container
- [ ] To share intermediate build layers across different machines

---

### FSE047
**Difficulty**: hard
**Topics**: devops:containers:docker, devops:containers:kubernetes
**Tags**: docker, capabilities, seccomp, rootless

A security audit flags a container running with excessive Linux capabilities. Which combination of mitigations most reduces blast radius?

- [x] Drop all capabilities with --cap-drop=ALL and add back only the minimum required; run as non-root (USER directive); apply a restrictive seccomp profile; mount the filesystem read-only
- [ ] Docker rootless mode automatically drops all unnecessary capabilities
- [ ] Build FROM scratch to eliminate all OS-level capabilities
- [ ] Enable AppArmor on the host to automatically restrict container capabilities

---

### FSE048
**Difficulty**: medium
**Topics**: devops:containers:kubernetes
**Tags**: kubernetes, rolling-update, availability

What does a Kubernetes RollingUpdate deployment guarantee during a rollout?

- [x] A minimum number of replicas stay available (maxUnavailable) and the total pod count stays within a bounded ceiling (maxSurge), so traffic is served throughout the update
- [ ] All old pods are terminated before any new pods start
- [ ] The update is atomic — all pods update or none do
- [ ] Kubernetes automatically rolls back if a liveness probe fails three times

---

### FSE049
**Difficulty**: hard
**Topics**: devops:containers:kubernetes
**Tags**: kubernetes, hpa, cluster-autoscaler, pod-pending

An HPA scales pods up during a traffic spike but new pods stay Pending for 3–4 minutes. What is the most likely bottleneck?

- [x] No node capacity is available; the Cluster Autoscaler has not yet provisioned new nodes — HPA scales pods but cannot provision nodes; reduce node startup time with smaller node pools or pre-warm nodes
- [ ] The HPA scaleUpStabilizationWindowSeconds is too large
- [ ] The readiness probe delay is too long
- [ ] The container image takes too long to pull on new nodes

---

### FSE050
**Difficulty**: medium
**Topics**: devops:ci-cd:pipelines
**Tags**: ci-cd, pipeline, stages

What does "shift-left" testing mean in a CI/CD pipeline?

- [x] Running tests earlier in the development lifecycle — unit and integration tests in local and early CI stages — rather than only in later staging or production environments
- [ ] Moving deployments to geographically closer (left) data centres
- [ ] Executing tests right-to-left in the pipeline to find regressions faster
- [ ] Shifting test authorship from QA to operations teams

---

### FSE051
**Difficulty**: hard
**Topics**: devops:ci-cd:pipelines, devops:ci-cd:testing
**Tags**: ci-cd, contract-testing, pact, consumer-driven

A microservices team needs to validate service interfaces without running all services simultaneously. What testing strategy fits best?

- [x] Consumer-driven contract testing (e.g. Pact) — consumers publish contracts; each service verifies its API against all contracts in CI, catching breaking changes without a shared integration environment
- [ ] Replace integration tests with unit tests and mock all external calls
- [ ] Run integration tests against a permanent shared staging environment
- [ ] Use synthetic monitoring to detect integration failures in production

---

### FSE052
**Difficulty**: easy
**Topics**: devops:ci-cd:testing
**Tags**: ci-cd, test-pyramid

In the test pyramid, which layer should have the most tests?

- [x] Unit tests — they are fast, isolated, and cheap to run; the pyramid narrows toward integration and E2E tests at the top
- [ ] End-to-end tests — they cover the most realistic user scenarios
- [ ] Integration tests — they catch the most bugs per test
- [ ] Manual tests — they are the most thorough

---

### FSE053
**Difficulty**: medium
**Topics**: devops:monitoring:metrics
**Tags**: prometheus, cardinality, labels

Why should high-cardinality values (e.g. user IDs) not be used as Prometheus label values?

- [x] Each unique label combination creates a separate time series; high cardinality causes memory to grow unboundedly and degrades ingestion and query performance
- [ ] Prometheus does not support string label values
- [ ] High-cardinality labels cause metric names to exceed the 255-character limit
- [ ] Labels with many unique values are automatically dropped by Prometheus

---

### FSE054
**Difficulty**: hard
**Topics**: devops:monitoring:metrics, devops:monitoring:logging
**Tags**: slo, error-budget, alerting, sre

An SRE team has a 99.9% SLO but alerts fire on every error, causing alert fatigue. Which approach aligns alerts with the error budget?

- [x] Alert on error budget burn rate — fire a page when the burn rate would exhaust the monthly budget within a short window (e.g. burn rate > 14× = budget gone in 1 hour)
- [ ] Set the alert threshold exactly to the SLO percentage (99.9%)
- [ ] Disable alerting and rely on dashboards
- [ ] Alert on any log error regardless of frequency or impact

---

### FSE055
**Difficulty**: medium
**Topics**: devops:monitoring:logging
**Tags**: logging, structured-logging, json

What is the primary benefit of structured (JSON) logging over plain-text log lines?

- [x] Fields are machine-parseable, allowing log aggregators to index, filter, and query by specific attributes (level, service, trace ID) without fragile regex parsing
- [ ] JSON logs are smaller than plain-text logs
- [ ] Structured logs automatically correlate across services
- [ ] Plain-text logging is unsupported by modern log shippers

---

### FSE056
**Difficulty**: easy
**Topics**: security:web:xss
**Tags**: security, csp, content-security-policy

Which HTTP response header mitigates XSS by restricting sources from which scripts can be loaded?

- [x] Content-Security-Policy (CSP)
- [ ] X-XSS-Protection
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security

---

### FSE057
**Difficulty**: medium
**Topics**: security:web:xss
**Tags**: security, dom-based-xss, innerhtml

Which code pattern is most vulnerable to DOM-based XSS?

- [x] element.innerHTML = location.hash — directly inserts unescaped user-controlled data into the DOM as HTML
- [ ] element.textContent = location.hash — treats the value as plain text
- [ ] fetch('/api/data').then(r => r.json()).then(d => console.log(d))
- [ ] document.cookie = 'session=' + token + '; Secure; HttpOnly'

---

### FSE058
**Difficulty**: hard
**Topics**: security:web:xss, security:web:csrf
**Tags**: security, trusted-types, dom-sink

An application uses a strict CSP but still suffers XSS via DOM sinks (innerHTML, eval). Which browser API eliminates this class of attack?

- [x] Trusted Types — requires all DOM sink assignments to pass through a typed policy; untyped string assignments throw exceptions, preventing injection at the sink
- [ ] Subresource Integrity (SRI) — validates script file hashes
- [ ] CORS with credentials — restricts cross-origin script access
- [ ] Permissions Policy — restricts browser feature access

---

### FSE059
**Difficulty**: medium
**Topics**: security:web:csrf
**Tags**: security, samesite, csrf-token

Which defence combination provides the most robust CSRF protection?

- [x] SameSite=Strict or Lax cookies combined with a synchroniser token (CSRF token) in forms or headers — defence-in-depth against same-site subdomain attacks
- [ ] HTTPS alone — TLS prevents CSRF attacks
- [ ] Custom Authorization header — CSRF cannot set custom headers from other origins
- [ ] Referer header validation alone — sufficient for all CSRF scenarios

---

### FSE060
**Difficulty**: hard
**Topics**: security:web:csrf, security:iam:permissions
**Tags**: security, subdomain-takeover, samesite-lax

An attacker controls attacker.example.com and uses it to forge requests to api.example.com. The API uses SameSite=Lax cookies. Why does SameSite=Lax fail to protect here?

- [x] SameSite applies to the eTLD+1 (example.com); a subdomain is same-site, so SameSite=Lax does not block cross-subdomain requests — a subdomain takeover can issue forged requests carrying the victim's cookies
- [ ] SameSite=Lax never protects against CSRF; only Strict does
- [ ] The Lax setting blocks all cross-origin requests including subdomains
- [ ] SameSite cookies are not sent over HTTPS, making them ineffective

---

### FSE061
**Difficulty**: easy
**Topics**: security:crypto:symmetric
**Tags**: security, aes-gcm, aead

Which modern symmetric algorithm is recommended for confidentiality in new applications?

- [x] AES-GCM — provides authenticated encryption with associated data (AEAD), protecting both confidentiality and integrity
- [ ] DES — considered insecure due to its 56-bit key
- [ ] MD5 — a hash function, not an encryption algorithm
- [ ] RSA — asymmetric; not used for bulk data encryption

---

### FSE062
**Difficulty**: hard
**Topics**: security:crypto:symmetric, security:crypto:asymmetric
**Tags**: security, tls, hybrid-encryption, session-key

Why does TLS use asymmetric cryptography for the handshake but symmetric encryption for data transfer?

- [x] Asymmetric algorithms are computationally expensive; the handshake uses them only to securely exchange a symmetric session key; all payload data is then encrypted with the faster symmetric cipher (AES-GCM)
- [ ] Symmetric encryption requires pre-sharing a secret, which TLS avoids entirely
- [ ] Asymmetric encryption is used throughout TLS to ensure non-repudiation of every message
- [ ] TLS uses RSA for encryption; symmetric keys are only used in legacy TLS versions

---

### FSE063
**Difficulty**: medium
**Topics**: security:crypto:asymmetric
**Tags**: security, ecdsa, rsa, signature

Why is ECDSA generally preferred over RSA for digital signatures in modern systems?

- [x] ECDSA achieves equivalent security with much shorter keys (256-bit ECDSA ≈ 3072-bit RSA), resulting in faster computation, smaller signatures, and lower bandwidth overhead
- [ ] ECDSA is easier to implement correctly without a cryptographic library
- [ ] RSA signatures require the message to be encrypted first
- [ ] ECDSA keys are immune to quantum computer attacks

---

### FSE064
**Difficulty**: medium
**Topics**: security:iam:roles
**Tags**: aws, iam, least-privilege

Which IAM practice reduces the blast radius if an AWS IAM role is compromised?

- [x] Principle of least privilege — grant only the permissions needed for specific tasks, use resource-level constraints, and scope conditions by time, IP, or MFA
- [ ] Create a single powerful role shared across all services to simplify management
- [ ] Use inline policies instead of managed policies for all roles
- [ ] Rotate IAM role credentials daily to reduce exposure window

---

### FSE065
**Difficulty**: hard
**Topics**: security:iam:roles, security:iam:permissions
**Tags**: aws, iam, privilege-escalation, permission-boundary

A developer has iam:CreateRole and iam:AttachRolePolicy. An auditor flags a privilege escalation risk. What is the threat and the correct control?

- [x] The developer can create a role with AdministratorAccess and assume it, escalating beyond their own permissions — apply a Permission Boundary limiting the maximum permissions of any role they create, enforced at the organisation level via SCPs
- [ ] The developer can enumerate all IAM policies; restrict iam:ListPolicies
- [ ] Attach an explicit deny for iam:PassRole to the developer's policy
- [ ] Enable CloudTrail to detect and automatically revert privilege escalation

---

### FSE066
**Difficulty**: easy
**Topics**: security:iam:permissions
**Tags**: aws, iam, explicit-deny, allow-deny

In AWS IAM, if both an explicit Allow and an explicit Deny apply to the same action for the same principal, what is the result?

- [x] The explicit Deny wins — a Deny always overrides any Allow, regardless of how many Allow statements exist
- [ ] The Allow wins because it is more specific
- [ ] The most recently attached policy wins
- [ ] The result is undefined and generates an error

---
