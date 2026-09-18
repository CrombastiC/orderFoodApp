-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('NOT_PAY', 'WAIT_BUYER_PAY', 'TRADE_CLOSED', 'TRADE_SUCCESS', 'TRADE_FINISHED');

-- AlterTable
ALTER TABLE "lottery_prizes" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "drawsSinceBigPrize" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "outTradeNo" TEXT NOT NULL,
    "tradeNo" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "tradeStatus" "TradeStatus" NOT NULL DEFAULT 'NOT_PAY',
    "payTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_outTradeNo_key" ON "payment_records"("outTradeNo");

-- CreateIndex
CREATE INDEX "payment_records_tradeNo_idx" ON "payment_records"("tradeNo");

-- CreateIndex
CREATE INDEX "payment_records_orderId_idx" ON "payment_records"("orderId");

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
