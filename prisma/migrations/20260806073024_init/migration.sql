-- CreateEnum
CREATE TYPE "bookings_session_type" AS ENUM ('in_person', 'online');

-- CreateEnum
CREATE TYPE "payments_method" AS ENUM ('card', 'jazzcash', 'easypaisa', 'bank');

-- CreateEnum
CREATE TYPE "patients_booking_for" AS ENUM ('self', 'family_member');

-- CreateEnum
CREATE TYPE "payments_status" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "bookings_status" AS ENUM ('tentative', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "bookings_payment_status" AS ENUM ('unpaid', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('patient', 'admin');

-- CreateTable
CREATE TABLE "availability" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "time_slot" TIME(0) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "session_type" "bookings_session_type" NOT NULL,
    "date" DATE NOT NULL,
    "time_slot" TIME(0) NOT NULL,
    "status" "bookings_status" NOT NULL DEFAULT 'tentative',
    "payment_status" "bookings_payment_status" NOT NULL DEFAULT 'unpaid',
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "specialty" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "age" SMALLINT,
    "booking_for" "patients_booking_for" NOT NULL DEFAULT 'self',
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "payments_method" NOT NULL,
    "gateway_ref" VARCHAR(255),
    "status" "payments_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(191),
    "phone" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "users_role" NOT NULL DEFAULT 'patient',
    "patient_id" INTEGER,
    "doctor_id" INTEGER,
    "password_reset_token" VARCHAR(191),
    "password_reset_expiry" TIMESTAMPTZ(0),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_schedule" (
    "id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "time_slot" TIME(0) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_availability_date" ON "availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_doctor_date_time" ON "availability"("doctor_id", "date", "time_slot");

-- CreateIndex
CREATE INDEX "idx_bookings_doctor_date" ON "bookings"("doctor_id", "date");

-- CreateIndex
CREATE INDEX "idx_bookings_patient" ON "bookings"("patient_id");

-- CreateIndex
CREATE INDEX "idx_bookings_status" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "idx_patients_phone" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "idx_payments_booking" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_phone" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_patient_id" ON "users"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_doctor_id" ON "users"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_password_reset_token" ON "users"("password_reset_token");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_weekly_schedule_doctor_weekday_active" ON "weekly_schedule"("doctor_id", "weekday", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_weekly_schedule_doctor_weekday_time" ON "weekly_schedule"("doctor_id", "weekday", "time_slot");

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "fk_availability_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_schedule" ADD CONSTRAINT "fk_weekly_schedule_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
