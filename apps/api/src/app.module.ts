import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrderModule } from "./modules/order/order.module";
import { PointsModule } from "./modules/points/points.module";
import { CouponModule } from "./modules/coupon/coupon.module";
import { MoneyModule } from "./modules/money/money.module";
import { UploadModule } from "./modules/upload/upload.module";
import { PayModule } from "./modules/pay/pay.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { AdminModule } from "./modules/admin/admin.module";
import { QueueModule } from "./modules/queue/queue.module";
import { SupportModule } from "./modules/support/support.module";
import { AddressModule } from "./modules/address/address.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    MenuModule,
    OrderModule,
    PointsModule,
    CouponModule,
    MoneyModule,
    UploadModule,
    PayModule,
    AdminModule,
    QueueModule,
    SupportModule,
    AddressModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
