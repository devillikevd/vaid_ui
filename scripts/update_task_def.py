import json
import os

task_def_path = "task-def.json"

with open(task_def_path, "r") as f:
    data = json.load(f)

containers = data.get("taskDefinition", {}).get("containerDefinitions", [])

# Add redis container
redis_container = {
    "name": "redis",
    "image": "redis:7-alpine",
    "cpu": 128,
    "memoryReservation": 128,
    "portMappings": [
        {
            "containerPort": 6379,
            "hostPort": 0,
            "protocol": "tcp"
        }
    ],
    "essential": True,
    "command": ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"],
    "environment": [],
    "mountPoints": [],
    "volumesFrom": [],
    "systemControls": [],
    "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
            "awslogs-group": "/ecs/swastik-prod",
            "awslogs-region": "ap-south-1",
            "awslogs-stream-prefix": "redis"
        }
    }
}

# Check if redis already exists
if not any(c.get("name") == "redis" for c in containers):
    containers.append(redis_container)

for c in containers:
    name = c.get("name")
    
    if name == "backend":
        # Add to links
        links = c.get("links", [])
        if "redis" not in links:
            links.append("redis")
            c["links"] = links
            
        # Update environment
        env = c.get("environment", [])
        # Remove old REDIS_URL if it was in env (just in case)
        env = [e for e in env if e["name"] not in ("REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")]
        env.append({"name": "REDIS_URL", "value": "redis://redis:6379"})
        c["environment"] = env
        
        # Remove from secrets
        secrets = c.get("secrets", [])
        secrets = [s for s in secrets if s["name"] not in ("REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")]
        c["secrets"] = secrets

    elif name == "ai-service":
        # Add to links
        links = c.get("links", [])
        if "redis" not in links:
            links.append("redis")
            c["links"] = links
            
        # Update environment
        env = c.get("environment", [])
        env = [e for e in env if e["name"] != "REDIS_URL"]
        env.append({"name": "REDIS_URL", "value": "redis://redis:6379"})
        c["environment"] = env
        
        # Remove from secrets
        secrets = c.get("secrets", [])
        secrets = [s for s in secrets if s["name"] != "REDIS_URL"]
        c["secrets"] = secrets

with open(task_def_path, "w") as f:
    json.dump(data, f, indent=4)
print("task-def.json updated successfully.")
