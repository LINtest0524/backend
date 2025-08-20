import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductVariantService } from './product-variant.service';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant]),
    UserModule,
    AuditLogModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductVariantService],
  exports: [ProductService, ProductVariantService],
})
export class ProductModule {}