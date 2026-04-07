# ECS Exec — Accessing the Running Backend Container

ECS Exec lets you open an interactive shell inside the running backend container on staging/prod.
This gives you access to the database (via `prisma db` commands) and the full app environment.

## Prerequisites

Install the AWS Session Manager plugin (one-time setup):

```bash
# macOS
brew install --cask session-manager-plugin
```

Verify it works:
```bash
session-manager-plugin --version
```

---

## Get the running task ID

```bash
aws ecs list-tasks \
  --cluster stocktracker-staging \
  --service-name stocktracker-backend \
  --query 'taskArns[0]' \
  --output text
```

This outputs something like:
```
arn:aws:ecs:us-east-1:640053196968:task/stocktracker-staging/abc123def456
```

The task ID is the last part: `abc123def456`

---

## Open a shell in the container

```bash
aws ecs execute-command \
  --cluster stocktracker-staging \
  --task <TASK_ID> \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

You are now inside the running container with all environment variables available.

---

## Common tasks inside the container

### Run a Prisma query (check if a user exists)
```bash
node -e "
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const prisma=new PrismaClient({adapter:new PrismaPg(pool)});
prisma.user.findMany({select:{id:true,email:true,isAdmin:true,isPremium:true}})
  .then(u=>{console.log(JSON.stringify(u,null,2));return prisma.\$disconnect()})
  .then(()=>pool.end())
"
```

### Reset admin password
```bash
node -e "
const {PrismaClient}=require('@prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const prisma=new PrismaClient({adapter:new PrismaPg(pool)});
bcrypt.hash('NewPassword123',12)
  .then(h=>prisma.user.update({where:{email:'admin@stocktracker.dev'},data:{passwordHash:h}}))
  .then(()=>{console.log('Done');return prisma.\$disconnect()})
  .then(()=>pool.end())
"
```

### Run database migrations manually
```bash
node node_modules/.bin/prisma migrate deploy --config prisma.config.ts
```

### Check environment variables
```bash
env | grep -v PATH
```

---

## Applying the Terraform change

ECS Exec requires `enable_execute_command = true` on the ECS service and SSM permissions
on the task IAM role — both already added to `infra/modules/ecs/main.tf`.

After merging and running `tofu apply`, force a new deployment so the running task
picks up the new permissions:

```bash
aws ecs update-service \
  --cluster stocktracker-staging \
  --service stocktracker-backend \
  --force-new-deployment
```

Wait for the service to stabilize, then ECS Exec will be available on the new task.
