# Disaster Recovery & Business Continuity Plan

## 1. Objectives & Metrics
- **Recovery Time Objective (RTO)**: < 15 minutes (Total time to restore full platform availability following catastrophe).
- **Recovery Point Objective (RPO)**: < 1 hour (Maximum acceptable data loss window).
- **Data Redundancy**: Multi-AZ automated backups synchronized with offsite immutable S3 storage.

---

## 2. Backup Automation Strategy

The platform maintains two tiers of automated backups:
1. **Continuous WAL Archiving**: Point-In-Time Recovery (PITR) for PostgreSQL with continuous transaction log archiving to MinIO/S3.
2. **Hourly Full Database Snapshots**: Managed via `k8s/backup-cronjob.yaml`:
   - Gzipped `pg_dump` with schema, data, and pgvector embeddings.
   - Retained for 7 days locally, 90 days in cold S3 glacier.

---

## 3. Disaster Recovery Restoration Procedure

### Step 1: Provision Clean Database Container / Pod
```bash
kubectl scale deployment/wastecare-backend -n wastecare-production --replicas=0
```

### Step 2: Identify Latest Certified Backup
```bash
kubectl exec -it -n wastecare-production deploy/wastecare-backup-storage -- ls -lh /backups
# Example file: wastecare_backup_20260915_220000.sql.gz
```

### Step 3: Stream Restoration into PostgreSQL
```bash
kubectl exec -i -n wastecare-production postgres-service-0 -- /bin/sh -c "
gunzip < /backups/wastecare_backup_20260915_220000.sql.gz | psql -U wasteadmin -d wastecare_production
"
```

### Step 4: Resume Application Services & Validate
```bash
kubectl scale deployment/wastecare-backend -n wastecare-production --replicas=3
kubectl scale deployment/wastecare-frontend -n wastecare-production --replicas=3
curl -f https://api.wastecare.gov/health
```
