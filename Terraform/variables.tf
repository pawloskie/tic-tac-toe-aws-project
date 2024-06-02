variable "service_name" {
  description = "A Docker image-compatible name for the service"
  type        = string
}

variable "region" {
  description = "AWS region"
  default     = "us-east-1"
  type        = string
}

variable "retention_in_days" {
  description = "Retention period for Cloudwatch logs"
  default     = 7
  type        = number
}

variable "launch_type" {
  description = "ECS launch type"
  type = object({
    type   = string
    cpu    = number
    memory = number
  })
  default = {
    type   = "EC2"
    cpu    = null
    memory = null
  }
}