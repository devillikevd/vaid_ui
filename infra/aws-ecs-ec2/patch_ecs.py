import json

with open("ecs.tf", "r") as f:
    lines = f.readlines()

# find container_definitions = jsonencode([
start_idx = -1
for i, line in enumerate(lines):
    if "container_definitions = jsonencode([" in line:
        start_idx = i
        break

end_idx = -1
for i in range(start_idx, len(lines)):
    if "  ])" in lines[i]:
        end_idx = i
        break

json_str = "[\n" + "".join(lines[start_idx+1:end_idx]) + "]"
# Terraform jsonencode string has some variables, e.g. ${aws_ecr_repository.backend.repository_url}:${var.image_tag}
# This makes it invalid JSON for Python!
