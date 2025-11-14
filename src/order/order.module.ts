import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderService } from './order.service'
import { OrderController } from './order.controller'
import { Order } from './order.entity'
import { OrderItem } from './order-item.entity'
import { Product } from '../product/product.entity'
import { User } from '../user/user.entity'
import { Company } from '../company/company.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User, Company]),
    forwardRef(() => AuthModule)
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}