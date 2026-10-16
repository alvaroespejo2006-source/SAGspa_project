-- AlterTable
-- HU-004: momento del último cambio de contraseña, para invalidar refresh tokens anteriores.
ALTER TABLE "users" ADD COLUMN     "password_changed_at" TIMESTAMP(3);
