cluster_addr  = "https://vault:8201"
api_addr      = "https://vault:8200"
disable_mlock = true
ui = true

listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_disable     = false
  tls_cert_file    = "/vault/config/certs/vault.crt"
  tls_key_file     = "/vault/config/certs/vault.key"
}


storage "file" {
  path = "/vault/file"
}

