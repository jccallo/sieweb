# Api Keys

```sql
CREATE TABLE api_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Dueño de la key
    owner_type VARCHAR(50) NOT NULL,
    owner_id BIGINT UNSIGNED NOT NULL,

    -- Información descriptiva
    name VARCHAR(255) NOT NULL,

    -- Seguridad
    key_hash CHAR(64) NOT NULL UNIQUE,

    -- Permisos
    abilities JSON NOT NULL,

    -- Uso y expiración
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,

    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Control de empresa
    created_by BIGINT UNSIGNED NULL,
    revoked_at TIMESTAMP NULL,
    rate_limit INT NULL,
    allowed_ips JSON NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    -- Índices recomendados
    INDEX idx_owner (owner_type, owner_id),
    INDEX idx_active (is_active),
    INDEX idx_expires_at (expires_at)
);

````
