# Operational Runbooks — Day-2 Engineering & Maintenance

## Runbook 01: Service Health Verification & Diagnostics

### Symptom: API Latency Spike or Pod Failures
```bash
# 1. Inspect running pod states in the production namespace
kubectl get pods -n wastecare-production -o wide

# 2. Check backend container logs
kubectl logs -n wastecare-production -l app.kubernetes.io/name=wastecare-backend --tail=100 -f

# 3. Verify Redis and Database connectivity
kubectl exec -it -n wastecare-production deploy/wastecare-backend -- python -c "
from app.core.database import SessionLocal
from app.services.cache_service import cache_service
db = SessionLocal()
print('DB Ping:', db.execute('SELECT 1').scalar())
print('Cache Stats:', cache_service.get_stats())
db.close()
"
```

---

## Runbook 02: Redis Cache Purge & Cache Key Invalidation

### Symptom: Stale disposal facility or policy information served to citizens
```bash
# Connect to Redis pod and invalidate tenant namespace
kubectl exec -it -n wastecare-production deploy/wastecare-redis -- redis-cli -a "$REDIS_PASSWORD"

# Invalidate specific tenant's facility cache
KEYS "default:locations:*"
DEL default:locations:all:all:none:none:none

# Complete cluster purge (Emergency only)
FLUSHDB
```

---

## Runbook 03: Zero-Downtime Blue-Green Deployment Cutover

### Procedure:
```bash
# 1. Deploy new version to 'green' deployment slot
kubectl apply -f k8s/blue-green-service.yaml

# 2. Scale green deployment up to match production load
kubectl scale deployment wastecare-backend-green -n wastecare-production --replicas=3

# 3. Verify green slot health
kubectl exec -it -n wastecare-production deploy/wastecare-backend-green -- curl -f http://localhost:8000/health

# 4. Patch active production service to point to green slot
kubectl patch service wastecare-backend-production-active -n wastecare-production -p '{"spec":{"selector":{"deployment-slot":"green"}}}'

# 5. Monitor Grafana error rates for 5 minutes. If stable, scale down blue slot:
kubectl scale deployment wastecare-backend-blue -n wastecare-production --replicas=0
```

---

## Runbook 04: Database Schema Migration Execution

```bash
# Run Alembic migrations via one-off Kubernetes Job
kubectl create job --from=cronjob/wastecare-db-backup migration-pre-backup -n wastecare-production
kubectl exec -it -n wastecare-production deploy/wastecare-backend -- alembic upgrade head
```
