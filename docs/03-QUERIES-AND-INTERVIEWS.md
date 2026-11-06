# 3. MongoDB queries and interview practice

The implemented queries live in `taskController.ts`, `adminController.ts`, and `utils/taskQuery.ts`. The examples below explain the same concepts and introduce a few **practice-only** operations. Practice-only examples are not exposed as API endpoints. In each example, `userId` is the authenticated user's ID and `Task` is the imported Mongoose model.

## CRUD: the essential four operations

```ts
// CREATE: insert a document. Await means wait for the database result.
const task = await Task.create({ title: 'Learn Node', owner: userId });

// READ MANY: always scope personal data to the authenticated owner.
const tasks = await Task.find({ owner: userId }).lean();

// READ ONE: use both ID and owner, not ID alone.
const task = await Task.findOne({ _id: taskId, owner: userId });

// UPDATE: $set modifies only supplied fields. new:true returns updated data.
const updated = await Task.findOneAndUpdate(
  { _id: taskId, owner: userId },
  { $set: { completed: true } },
  { new: true, runValidators: true }
);

// DELETE: the ownership condition is part of the delete operation itself.
const deleted = await Task.findOneAndDelete({ _id: taskId, owner: userId });
```

`find` returns an array (possibly empty). `findOne` returns one document or null. `findById(id)` searches by `_id`, but it does not add ownership. `findOneAndUpdate` is useful when you need the updated document; `updateOne` returns write metadata such as `matchedCount` and `modifiedCount`. Setting an already-true flag to true can have `modifiedCount:0` even when a document matched.

## Completion and priority

```ts
await Task.find({ owner: userId, completed: true });
await Task.find({ owner: userId, completed: false, priority: 'high' });
```

Multiple fields in one filter are implicit AND. To match either condition, use `$or`:

```ts
await Task.find({
  owner: userId,
  $or: [{ priority: 'high' }, { completed: false }]
});
```

Keep owner outside `$or` so **every branch** is still owner-scoped.

## Title search and regex injection

```ts
await Task.find({
  owner: userId,
  title: { $regex: escapeRegex(searchText), $options: 'i' }
});
```

`i` means case-insensitive. We escape input so searching `C++` or `.*` treats those characters literally. Accepting arbitrary regex patterns can produce surprising matches or expensive expressions. The request also caps title length.

This simple substring search can scan many documents. A normal B-tree index does not make arbitrary case-insensitive substring search efficient. For a larger application, consider a suitable full-text/search index and measure using `explain`, rather than assuming an index always fixes search.

## Arrays: tags

```ts
// Array contains one exact element.
await Task.find({ owner: userId, tags: 'backend' });

// Practice: any of these tags ($in).
await Task.find({ owner: userId, tags: { $in: ['backend', 'interview'] } });

// Practice: contains every specified tag ($all).
await Task.find({ owner: userId, tags: { $all: ['backend', 'interview'] } });

// Practice: add uniquely; unlike $push, $addToSet avoids duplicate values.
await Task.updateOne({ _id: taskId, owner: userId }, { $addToSet: { tags: 'practice' } });

// Practice: remove matching array values.
await Task.updateOne({ _id: taskId, owner: userId }, { $pull: { tags: 'practice' } });
```

The app's PATCH endpoint replaces the whole tags array after validation. It does not expose `$addToSet` or `$pull` directly. Direct model writes should also preserve application rules such as max five tags.

## Dates and overdue tasks

```ts
await Task.find({
  owner: userId,
  dueDate: { $gte: new Date(startISO), $lte: new Date(endISO) }
});

await Task.find({
  owner: userId,
  completed: false,
  dueDate: { $ne: null, $lt: new Date() }
});
```

`$gt`/`$gte` mean greater than/greater than or equal; `$lt`/`$lte` mean less than/less than or equal; `$ne` means not equal. MongoDB stores dates as instants, not formatted display strings. The API requires full UTC ISO timestamps. A UI date becomes midnight UTC, so choose deadlines with that behavior in mind.

The query builder uses `$and` when multiple features constrain dueDate. Otherwise assigning `filter.dueDate` twice would accidentally overwrite the earlier date range.

## Pagination, sorting, counts, projection

```ts
const page = 2;
const limit = 10;
const filter = { owner: userId, completed: false };
const [tasks, total] = await Promise.all([
  Task.find(filter)
    .sort({ createdAt: -1, _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),
  Task.countDocuments(filter)
]);
const pages = Math.ceil(total / limit);

// Practice: return only the fields the caller needs.
await Task.find(filter).select('title completed priority').lean();
```

Sort 1 is ascending, -1 descending. A deterministic `_id` tiebreaker prevents arbitrary ordering when primary sort values tie. It does not prevent offset pages shifting when records are inserted/deleted between requests. Count and list are separate reads, so concurrent writes can also produce slight differences.

`lean()` returns plain objects instead of full Mongoose documents. It is useful for read-only responses because you do not need document methods/change tracking. It does not enable saving or document middleware.

Skip/limit is easy to learn, but deep offsets become expensive. Practice cursor pagination with a stable field combination (for example createdAt plus `_id`). A single `_id < cursor` condition only makes sense when `_id` ordering is the chosen sort.

## Aggregation: counts in one pipeline

The stats endpoint first matches the authenticated owner, then groups:

```ts
const [summary] = await Task.aggregate([
  { $match: { owner: new mongoose.Types.ObjectId(userId) } },
  { $group: {
    _id: null,
    total: { $sum: 1 },
    completed: { $sum: { $cond: ['$completed', 1, 0] } }
  } },
  { $project: {
    _id: 0, total: 1, completed: 1,
    pending: { $subtract: ['$total', '$completed'] }
  } }
]);
```

- `$match` filters documents early.
- `$group` combines them. `_id:null` creates a single summary group.
- `$sum:1` counts each document.
- `$cond` contributes 1 only when the condition is true.
- `$project` chooses/calculates output fields.
- An empty match produces no group; the controller returns zero defaults.

Mongoose query casting and aggregation casting differ: use an ObjectId explicitly in aggregation `$match`. Passing a string there will not automatically behave like an ObjectId.

Practice grouping by priority:

```ts
await Task.aggregate([
  { $match: { owner: new mongoose.Types.ObjectId(userId) } },
  { $group: { _id: '$priority', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

## References: populate vs $lookup

The admin API uses:

```ts
await Task.find(filter).populate('owner', 'name email').lean();
```

`populate` is Mongoose convenience for resolving references; it typically performs additional queries. `$lookup` is a MongoDB aggregation join stage. Neither means MongoDB enforces a SQL-style foreign key. Select public fields explicitly and do not populate password hashes.

## Indexes and unique email

The project creates compound indexes supporting owner-scoped filtering/sorting, plus an owner/due-date index. Indexes speed certain reads but consume storage and increase write cost. An index with `owner, completed, createdAt` is useful when owner and completed are equality filters and createdAt is the sort. It does not efficiently satisfy every combination or arbitrary title search.

`unique:true` on email creates a unique index; it is **not a Zod or Mongoose validator**. Two simultaneous registrations can race, so the database unique constraint is necessary. The error handler maps duplicate key code 11000 to HTTP 409.

Practice examining a plan:

```ts
await Task.find({ owner: userId, completed: false })
  .sort({ createdAt: -1 }).explain('executionStats');
```

Compare keys/documents examined and returned results. For production, manage index creation deliberately with migrations rather than relying on startup automatic indexing at scale.

## Other common interview methods (practice only)

```ts
await Task.exists({ owner: userId, completed: false }); // matching _id or null
await Task.distinct('priority', { owner: userId }); // unique stored values
await Task.updateMany({ owner: userId, completed: false }, { $set: { completed: true } });
await Task.deleteMany({ owner: userId, completed: true });
await Task.insertMany([{ title: 'A', owner: userId }, { title: 'B', owner: userId }]);
```

Do not run bulk mutation examples on data you want to keep. These are exercises, not buttons or exposed endpoints. `$inc` atomically increments numeric counters; it is not used for the completion boolean. Transactions are appropriate when multiple documents must change together atomically. Individual document updates are atomic; the app's normal task update does not require a multi-document transaction.

## Short interview answers

| Question | Answer grounded in this project |
| --- | --- |
| Why validate if TypeScript already has types? | Types disappear at runtime; HTTP requests are untrusted data. Zod checks actual input. |
| PUT versus PATCH? | PUT generally replaces a representation; PATCH applies partial changes. The app uses PATCH with an allowlist. |
| Authentication versus authorization? | Auth verifies who is signed in; authorization checks role or task ownership. |
| Why not pass req.query to find()? | It permits unwanted operators/fields and uncontrolled queries. Build a filter from validated scalar values. |
| How do you stop IDOR? | Include authenticated owner in read/update/delete filters; never trust body owner. |
| Why runValidators on updates? | Mongoose update validation is opt-in; request validation and schema validation protect different boundaries. |
| Why 404 for another user's task? | It prevents disclosing whether the task exists. |
| What if JWT role is stale? | This API reads the current database role on each request. |
| How does async/await help Node? | It lets I/O yield without blocking the JS thread; it does not make CPU-heavy work automatically parallel. |
| Why Promise.all for list and count? | Independent database reads can run concurrently. They are not a consistent transactional snapshot. |
| How would you scale this? | Profile queries, add appropriate indexes/cursor pagination, use shared rate-limit storage, and manage connections. |
| What is the frontend auth guard worth? | It improves UX; only API authorization protects the data. |

## Suggested exercises after the app works

1. Add a category field from form through Zod/schema/query to UI.
2. Add `$in` multi-priority filtering with an explicitly validated array.
3. Add cursor pagination and tests for equal sort timestamps.
4. Add per-user priority aggregation and chart it.
5. Implement refresh token rotation using the security guide's outline.
6. Split complex business logic into a service only when needed.
