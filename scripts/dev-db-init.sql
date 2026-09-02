-- Bootstrap del Postgres de desarrollo (Docker).
-- El usuario del contenedor (barberdesk) es superusuario y Postgres exime a los
-- superusuarios de RLS, así que la app se conecta con este rol sin privilegios.
-- Las migraciones siguen corriendo como barberdesk (MIGRATE_DATABASE_URL).
-- En producción (Neon/Supabase) el usuario provisto no es superusuario y las
-- policies llevan FORCE, por lo que este script no es necesario allí.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'barberdesk_app') THEN
    CREATE ROLE barberdesk_app LOGIN PASSWORD 'barberdesk_app';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO barberdesk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO barberdesk_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO barberdesk_app;

-- Las tablas que creen migraciones futuras heredan los mismos permisos
ALTER DEFAULT PRIVILEGES FOR ROLE barberdesk IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO barberdesk_app;
ALTER DEFAULT PRIVILEGES FOR ROLE barberdesk IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO barberdesk_app;
