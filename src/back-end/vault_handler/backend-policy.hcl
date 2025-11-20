# Accès complet aux données KV v2
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Accès aux métadonnées (versions, existence, listing)
path "secret/metadata/*" {
  capabilities = ["read", "list"]
}
# Facultatif : accès lecture sur la config globale
path "secret/data/config" {
  capabilities = ["read", "list"]
}
