import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderService } from './order.service'
import { OrderController } from './order.controller'
import { Order } from './order.entity'
import { OrderItem } from './order-item.entity'
import { Product } from '../product/product.entity'
import { User } from '../user/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}