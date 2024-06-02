resource "aws_ecs_cluster" "projekt_2_ecs_cluster" {
  name = "Fargate-cluster"
}

resource "aws_ecs_task_definition" "projekt_2_ecs_task" {
  family                   = "Fargate-task"
  network_mode             = "awsvpc"
  execution_role_arn       = "arn:aws:iam::414209194151:role/LabRole"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "414209194151.dkr.ecr.us-east-1.amazonaws.com/projekt2:latest"
      essential = true
      cpu       = 0

      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
    },

    {
      name      = "backend"
      image     = "414209194151.dkr.ecr.us-east-1.amazonaws.com/projekt2-backend:latest"
      essential = true
      cpu       = 0

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options   = {
          "awslogs-group"         = "/ecs/tictactoe"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    },

    {
      name      = "backendAuth"
      image     = "414209194151.dkr.ecr.us-east-1.amazonaws.com/projekt2-backendauth:latest"
      essential = true
      cpu       = 0

      portMappings = [
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]
    },
  ])
}

resource "aws_cloudwatch_log_group" "projekt_2_log_group" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = var.retention_in_days
}

resource "aws_ecs_service" "projekt_2_ecs_service" {
  name            = "Fargate-service"
  cluster         = aws_ecs_cluster.projekt_2_ecs_cluster.id
  task_definition = aws_ecs_task_definition.projekt_2_ecs_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.projekt_2_subnet.id]
    security_groups  = [aws_security_group.projekt_2_security_group.id]
    assign_public_ip = true
  }
}
