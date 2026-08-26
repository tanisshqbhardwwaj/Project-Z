# Microservices Roadmap

Project Z is a **modular monolith** today. Physical service extraction should follow measured need, not premature splitting.

## Keep together (transactional core)

These domains share `prisma.$transaction`, bill counters, stock reservations, and offline sync snapshots:

- Shop POS / sales (`src/services/shop.service.ts`, `createShopSale`)
- Inventory and catalog (`src/services/shop-product.service.ts`)
- Returns and exchanges (`src/services/shop-return.service.ts`)
- Udhaar / customer credit (`src/services/shop-credit.service.ts`)
- Offline sync orchestration (`src/services/shop-sync.service.ts`)
- Staff expense links (`src/lib/shop/staff-expense-links.ts`)

**Risk if split early:** duplicate bill numbers, incorrect stock, broken udhaar balances, partial desktop sync.

## Domain modules (in-repo today)

| Module | Entry | Notes |
|--------|-------|-------|
| Shop | `src/services/shop/index.ts` | Largest surface; list queries in `sales-list.service.ts` |
| Projects | `src/services/projects/index.ts` | Projects, expenses, settlements |
| Staff | `src/services/staff/index.ts` | Payroll, attendance, commission |
| Platform | `src/services/platform/index.ts` | Org, billing, ops, search |

## First extraction candidates (after observability + contracts)

1. **AI extraction worker** — `src/inngest/functions.ts`, already async via Inngest
2. **Notification / email delivery** — `src/services/notification.service.ts`, `src/lib/email/`
3. **Search / reporting read model** — `src/services/search.service.ts`; read-only, cursor-friendly
4. **Object storage gateway** — `src/lib/storage/index.ts`, quota in `storage-quota.service.ts`
5. **Platform ops admin** — `src/app/api/v1/ops/*`, separate auth plane

## Extraction checklist (per service)

- [ ] Versioned HTTP or event contract (`{ items, nextCursor, hasMore }` for lists)
- [ ] Tenant authorization on every request (`organizationId` + RBAC)
- [ ] Idempotent writes (`clientId` / idempotency keys — see `src/lib/api/idempotency.ts`)
- [ ] Correlation IDs (`src/lib/api/correlation-id.ts`)
- [ ] Independent health checks and deployment
- [ ] No shared Prisma tables across services

## API contracts prepared in this refactor

### Cursor list responses

```json
{
  "data": {
    "items": [],
    "nextCursor": "uuid-or-null",
    "hasMore": true
  }
}
```

Used by: sales, customers, purchases, expenses, activity, returns.

### Client hooks

- `useDebouncedValue` — stable search input
- `useInfiniteShopList` — load-more lists
- `useStableListQuery` — non-infinite lists with keepPreviousData

## When to split

Split only when you have **evidence**: independent scaling pressure, deploy conflicts, or team ownership boundaries that the monolith cannot solve with indexing, caching, background jobs, and read replicas.

Until then: grow domain folders inside `src/services/`, keep one database, and use Inngest for async work.
