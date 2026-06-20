resource "aws_s3_bucket" "uploads" {
  count = var.create_s3_bucket ? 1 : 0

  bucket = local.s3_bucket_name
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  count = var.create_s3_bucket ? 1 : 0

  bucket                  = aws_s3_bucket.uploads[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  count = var.create_s3_bucket ? 1 : 0

  bucket = aws_s3_bucket.uploads[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "uploads" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.uploads[0].id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "EnforceHTTPS",
        Effect    = "Deny",
        Principal = "*",
        Action    = "s3:*",
        Resource = [
          aws_s3_bucket.uploads[0].arn,
          "${aws_s3_bucket.uploads[0].arn}/*"
        ],
        Condition = {
          Bool = {
            "aws:SecureTransport" : "false"
          }
        }
      }
    ]
  })
}
