-- AlterTable
ALTER TABLE `adminuser` MODIFY `role` ENUM('OWNER', 'MANAGER', 'STAFF', 'RECEPTION', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT') NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE `booking` ADD COLUMN `actualCheckInAt` DATETIME(3) NULL,
    ADD COLUMN `actualCheckOutAt` DATETIME(3) NULL,
    ADD COLUMN `noShowMarkedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `guest` ADD COLUMN `internalNotes` TEXT NULL,
    ADD COLUMN `preferences` JSON NULL;

-- CreateTable
CREATE TABLE `HousekeepingTask` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `scheduledDate` DATE NOT NULL,
    `status` ENUM('DIRTY', 'ASSIGNED', 'CLEANING', 'READY', 'INSPECTED') NOT NULL DEFAULT 'DIRTY',
    `assignedToId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HousekeepingTask_unitId_scheduledDate_idx`(`unitId`, `scheduledDate`),
    UNIQUE INDEX `HousekeepingTask_unitId_scheduledDate_key`(`unitId`, `scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceIssue` (
    `id` VARCHAR(191) NOT NULL,
    `propertyId` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'REPORTED',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `assignedToId` VARCHAR(191) NULL,
    `reportedById` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaintenanceIssue_status_idx`(`status`),
    INDEX `MaintenanceIssue_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HousekeepingTask` ADD CONSTRAINT `HousekeepingTask_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HousekeepingTask` ADD CONSTRAINT `HousekeepingTask_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceIssue` ADD CONSTRAINT `MaintenanceIssue_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceIssue` ADD CONSTRAINT `MaintenanceIssue_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceIssue` ADD CONSTRAINT `MaintenanceIssue_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
