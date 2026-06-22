data "aws_ssm_parameter" "al2023_arm64" {
  count = var.turn_enabled ? 1 : 0
  name  = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_ssm_parameter" "turn_password" {
  name = "/${var.project_name}/${var.environment}/turn_password"
}

resource "aws_security_group" "turn" {
  count = var.turn_enabled ? 1 : 0

  name        = "${local.name}-turn-sg"
  description = "Coturn TURN server access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "TURN UDP"
    from_port   = 3478
    to_port     = 3478
    protocol    = "udp"
    cidr_blocks = var.turn_allowed_cidr_blocks
  }

  ingress {
    description = "TURN TCP"
    from_port   = 3478
    to_port     = 3478
    protocol    = "tcp"
    cidr_blocks = var.turn_allowed_cidr_blocks
  }

  ingress {
    description = "TURN TLS UDP"
    from_port   = 5349
    to_port     = 5349
    protocol    = "udp"
    cidr_blocks = var.turn_allowed_cidr_blocks
  }

  ingress {
    description = "TURN TLS TCP"
    from_port   = 5349
    to_port     = 5349
    protocol    = "tcp"
    cidr_blocks = var.turn_allowed_cidr_blocks
  }

  ingress {
    description = "Certbot HTTP Challenge"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "TURN relay UDP range"
    from_port   = var.turn_min_port
    to_port     = var.turn_max_port
    protocol    = "udp"
    cidr_blocks = var.turn_allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "turn" {
  count = var.turn_enabled ? 1 : 0

  ami                         = data.aws_ssm_parameter.al2023_arm64[0].value
  instance_type               = var.turn_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.turn[0].id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.turn_instance.name
  user_data_replace_on_change = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  user_data = templatefile("${path.module}/templates/coturn-user-data.sh.tftpl", {
    turn_realm       = var.turn_realm
    turn_domain_name = var.turn_domain_name
    turn_username    = var.turn_username
    turn_password    = data.aws_ssm_parameter.turn_password.value
    turn_min_port    = var.turn_min_port
    turn_max_port    = var.turn_max_port
    turn_total_quota = var.turn_total_quota
  })

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  tags = {
    Name = "${local.name}-turn"
  }
}

resource "aws_eip" "turn" {
  count = var.turn_enabled && var.turn_allocate_eip ? 1 : 0

  domain   = "vpc"
  instance = aws_instance.turn[0].id

  tags = {
    Name = "${local.name}-turn-eip"
  }
}
