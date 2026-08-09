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

# L019/L030: versioning keeps every upload recoverable (protects against
# accidental overwrite/deletion and supports encrypted backup restore).
resource "aws_s3_bucket_versioning" "uploads" {
  count  = var.create_s3_bucket && var.enable_s3_versioning ? 1 : 0
  bucket = aws_s3_bucket.uploads[0].id

  versioning_configuration {
    status = "Enabled"
    # MFA Delete cannot be set by Terraform (requires the operator's MFA token
    # on the API call). It is also incompatible with the app's programmatic
    # delete flow, so it is NOT enabled here — see the enable_s3_mfa_delete
    # variable and scripts/enable_s3_mfa_delete.sh for the documented path.
    mfa_delete = "Disabled"
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
