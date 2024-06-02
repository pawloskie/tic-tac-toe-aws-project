resource "aws_vpc" "projekt_2_vpc" {
  cidr_block           = "10.0.0.0/16"

  enable_dns_hostnames = true

  enable_dns_support   = true

  tags = {
    Name = "Projekt 2 VPC"
  }
}

resource "aws_subnet" "projekt_2_subnet" {
  vpc_id = aws_vpc.projekt_2_vpc.id

  cidr_block = "10.0.0.0/24"

  tags = {
    Name = "Projekt 2 subnet"
  }
}

resource "aws_internet_gateway" "projekt_2_internet_gateway" {
  vpc_id = aws_vpc.projekt_2_vpc.id

  tags = {
    Name = "Projekt 2 internet gateway"
  }
}

resource "aws_route_table" "projekt_2_route_table" {
  vpc_id = aws_vpc.projekt_2_vpc.id

  route {
    cidr_block = "0.0.0.0/0"

    gateway_id = aws_internet_gateway.projekt_2_internet_gateway.id
  }

  tags = {
    Name = "Projekt 2 route table"
  }

}

resource "aws_route_table_association" "projekt_2_subnet" {
  subnet_id      = aws_subnet.projekt_2_subnet.id
  route_table_id = aws_route_table.projekt_2_route_table.id
}

resource "aws_security_group" "projekt_2_security_group" {
  name   = "security_group"
  vpc_id = aws_vpc.projekt_2_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    description = "Outbound traffic"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    description = "SSH"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    description = "Frontend"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    description = "Backend"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    description = "BackendAuth"
    cidr_blocks = ["0.0.0.0/0"]
  }
}