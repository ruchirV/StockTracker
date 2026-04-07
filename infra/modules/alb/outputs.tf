output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "https_listener_arn" {
  value = aws_lb_listener.https.arn
}

output "http_listener_arn" {
  value = aws_lb_listener.http.arn
}
